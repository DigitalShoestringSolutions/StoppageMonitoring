import React from 'react'
import { Container, Pagination, Card, Col, Row, Button, Modal, Table, Spinner } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import { useMQTTControl, useMQTTState } from './MQTTContext';
import APIBackend from './RestAPI'
import * as dayjs from 'dayjs'
import { useToastDispatch, add_toast } from "./ToastContext";

import { STATUS } from './variables';

export function AutoPage({ config, machine_list }) {
  let params = useParams();
  const machine_id = Number(params.machine_id)
  let machine = machine_list.find(elem => elem.id === machine_id)

  let { status, events } = useMQTTState();
  let event_list = events[machine.name] ?? []
  let machine_status = status[machine.name] ?? STATUS.disconnected
  const { sendJsonMessage, subscribe, unsubscribe } = useMQTTControl()

  let [loaded, setLoaded] = React.useState(false)
  let [pending, setPending] = React.useState(false)
  let [error, setError] = React.useState(null)
  let [showModal, setShowModal] = React.useState(false);
  let [subscribed, setSubscribed] = React.useState(false)
  let [reasons, setReasons] = React.useState([])
  let [selected_category, setSelectedCategory] = React.useState(undefined)
  let [current_event, setCurrentEvent] = React.useState(undefined)

  let toast_dispatch = useToastDispatch()

  // console.log(event_list)

  //load reasons
  React.useEffect(() => {
    let do_load = async () => {
      setPending(true)
      let url = (config.reasons_api.host ? config.reasons_api.host : window.location.hostname) + (config.reasons_api.port ? ":" + config.reasons_api.port : "")
      let response = await APIBackend.api_get('http://' + url + '/reasons/' + machine_id);
      if (response.status === 200) {
        let raw_reasons = response.payload;
        console.log("Loaded Reasons:", raw_reasons)
        setReasons(raw_reasons)
      } else {
        console.error("Unable to load reasons for machine " + machine_id + " using default list")
        setError("Unable to load error reasons for this machine - please try refresh")
      }
      setLoaded(true)
    }
    if (!loaded && !pending) {
      do_load()
    }
  }, [loaded, pending, config, machine_id])

  React.useEffect(() => {
    if (!subscribed) {
      subscribe("equipment_monitoring/status/" + machine.name)
      subscribe("event_sm/" + machine.name + "/#")
      subscribe("status/" + machine.name + "/alive")
      setSubscribed(true)
    }
  }, [machine.name, subscribe, subscribed])

  React.useEffect(() => {
    return () => {
      unsubscribe("equipment_monitoring/status/" + machine.name)
      unsubscribe("event_sm/" + machine.name + "/#")
      unsubscribe("status/" + machine.name + "/alive")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  //todo: only add to event list if sent
  const do_update = async (topic, payload, updated_event) => {

    if (!Array.isArray(topic))
      topic = [topic]

    topic.unshift(machine.name ? machine.name : "unspecified");
    topic.unshift("stoppages");
    topic.unshift("auto_input");

    try {
      sendJsonMessage(topic, payload);
      sendJsonMessage('event_sm/' + updated_event.machine_name + "/reason", updated_event)
      add_toast(toast_dispatch, { header: "Sent" })
    }
    catch (err) {
      console.error(err)
      add_toast(toast_dispatch, { header: "Error", body: err })
    }
    finally {
    }
  }

  const handleEventClick = (event) => {
    setShowModal(true)
    setCurrentEvent(event)
  }

  const handleReasonClick = (id) => {
    setShowModal(false)
    let category = reasons.find(elem => elem.category_id === selected_category)
    let reason = category.reasons.find(elem => elem.id === id).text
    do_update("reason", { machine_name: current_event.machine_name, timestamp: current_event.stop, status: reason }, { ...current_event, reason: reason })
    setSelectedCategory(undefined)
    setCurrentEvent(undefined)
  }

  const closeModal = () => {
    setShowModal(false);
    setSelectedCategory(undefined)
    setCurrentEvent(undefined)
  }

  if (!loaded) {
    return <Container fluid="md">
      <Card className='mt-2 text-center'>
        {error !== null ? <h1>{error}</h1> : <Spinner></Spinner>}
      </Card>
    </Container>
  } else {
    return <>
      <Card className='mt-2'>
        <Card.Header className='text-center'>
          <h1>{machine?.name}</h1>
        </Card.Header>
        <Card.Body>
          <StatusBar status={machine_status} />
          <EventLog current={current_event} events={event_list} config={config} handleEventClick={handleEventClick} />
        </Card.Body>
      </Card>
      <ReasonModal
        show={showModal}
        handleClick={handleReasonClick}
        selected_category={selected_category}
        handleCategoryClick={(id) => setSelectedCategory(id)}
        reason_set={reasons}
        close={closeModal} />
    </>
  }
}

function EventLog({ events, config, current, handleEventClick }) {
  if (current) {
    events = [current, ...events]
  }

  const [active_page, setActive] = React.useState(1)
  let page_size = config?.capture_page?.event_log_length ?? 10
  page_size = Number(page_size)
  let n_pages = Math.ceil(events.length / page_size)
  n_pages = n_pages > 0 ? n_pages : 1
  let current_page_set = paginate(events, page_size, active_page)

  return <Card className='mt-4 mx-2'>
    <PaginateWidget active={active_page} n_pages={n_pages} setPage={(number) => setActive(number)} />
    <Table bordered striped responsive="sm">
      <thead>
        <tr>
          <th>Downtime</th>
          <th>Duration</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        {current_page_set.map((event, index) => (
          <tr key={index}>
            <td>{dayjs(event.start).format('DD/MM/YYYY HH:mm:ss')} + "to" + {dayjs(event.stop).format('DD/MM/YYYY HH:mm:ss')}</td>
            <td>{event.duration ? dayjs.duration(event.duration).format('m[m] s[s]') : ""}</td>
            <td>{event.reason ? event.reason : <Button onClick={() => handleEventClick(event)}>Set</Button>}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </Card>
}

function PaginateWidget({ active, n_pages, setPage }) {
  const [scroll, doSetScroll] = React.useState(1)
  const show_limit = 8

  //defaults: n_pages <= show_limit - show all normally
  let pages_shown = n_pages
  let show_prev = false
  let prev_active = false
  let prev_ellipsis = false
  let next_ellipsis = false
  let next_active = false
  let show_next = false

  if (n_pages > show_limit) {
    pages_shown = show_limit - 4
    show_prev = true
    prev_ellipsis = true
    next_ellipsis = true
    show_next = true

    if (scroll < 3) {
      show_prev = false
      pages_shown++
      prev_ellipsis = false
      pages_shown++
    }

    if (scroll > active) {
      prev_active = true
      pages_shown--
    }

    if (scroll > n_pages - pages_shown - 2) {
      show_next = false
      pages_shown++
      next_ellipsis = false
      pages_shown++
    } else if (scroll + pages_shown <= active) {
      next_active = true
      pages_shown--
    }
  }


  const setScroll = (n) => {
    if (n === +1 && scroll < 4) {
      doSetScroll(5)
      return
    }
    if (n === -1 && scroll === 5) {
      doSetScroll(1)
      return
    }

    if (n === +1 && active === scroll) {
      n = +2
    }

    if (n === +1 && scroll + pages_shown === active - 1) {
      n = +1
    }

    if (n === -1 && active === scroll - 2) {
      n = -2
    }
    // if (n >= 1 && n <= n_pages - show_limit + 1)
    doSetScroll(scroll + n)
  }

  let pages = Array.from({ length: pages_shown }, (_, i) => i + scroll)

  return <div className="d-flex justify-content-center mt-1 mb-1">
    <Pagination size="sm" className='mb-0'>
      {show_prev ? <Pagination.Prev onClick={() => setScroll(-1)} /> : ""}
      {prev_active ? <Pagination.Item key={active} active={true}>{active}</Pagination.Item> : ""}
      {prev_ellipsis ? <Pagination.Ellipsis /> : ""}
      {pages.map(number => (<Pagination.Item key={number} active={number === active} onClick={() => setPage(number)}>{number}</Pagination.Item>))}
      {next_ellipsis ? <Pagination.Ellipsis /> : ""}
      {next_active ? <Pagination.Item key={active} active={true}>{active}</Pagination.Item> : ""}
      {show_next ? <Pagination.Next onClick={() => setScroll(+1)} /> : ""}
    </Pagination>
  </div>
}

function paginate(array, page_size, page_number) {
  // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
  return array.slice((page_number - 1) * page_size, page_number * page_size);
}

function StatusBar({ status }) {
  // console.log(status)
  let status_bar = <Button variant="secondary" size="lg" disabled={true}>Disconnected</Button>
  if (status === STATUS.running)
    status_bar = <Button variant="success" size="lg" disabled={true}>Running</Button>
  else if (status === STATUS.stopped)
    status_bar = <Button variant="danger" size="lg" disabled={true}>Stopped</Button>

  return <Container fluid>
    <Row className='gx-2 gy-1'>
      <Col xs={12} className="d-grid px-1">
        {status_bar}
      </Col>
    </Row>
  </Container>
}

function ReasonModal({ show, handleClick, selected_category, handleCategoryClick, reason_set,close }) {

  let category_modal = <> <Modal.Header className='text-center'>
    <Modal.Title className="w-100">Reason Categories <Button variant='light' className='float-end' onClick={() => close()}>Close</Button></Modal.Title>
  </Modal.Header>
    <Modal.Body>
      <Row className='gx-2 gy-2'>
        {reason_set.map(category => (
          <Col xs={12} sm={6} md={4} lg={3} key={category.category_id} className='d-grid'>
            <Button style={{ backgroundColor: category.colour, borderColor: 'transparent', color: 'black' }} size='lg' onClick={() => handleCategoryClick(category.category_id)}>
              {category.category_name}
            </Button>
          </Col>
        ))}
      </Row>
    </Modal.Body>
  </>

  let chosen_category = reason_set.find(elem => elem.category_id === selected_category)

  let reason_modal = <>
    <Modal.Header className='text-center'>
      <Modal.Title className="w-100">Reason for Category {chosen_category?.category_name} <Button variant='light' className='float-end' onClick={() => handleCategoryClick(undefined)}>Back</Button></Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Row className='gx-2 gy-2'>
        {chosen_category?.reasons.map(reason => (
          <Col xs={12} sm={6} md={4} lg={3} key={reason.id} className='d-grid'>
            <Button variant="primary" size='lg' onClick={() => handleClick(reason.id)}>
              {reason.text}
            </Button>
          </Col>
        ))}
      </Row>
    </Modal.Body>
  </>


  return <Modal show={show} fullscreen={true}>
    {selected_category === undefined ? category_modal : reason_modal}
  </Modal>
}
