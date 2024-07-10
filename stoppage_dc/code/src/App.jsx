import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react'
import * as dayjs from 'dayjs'
import * as duration from 'dayjs/plugin/duration';
import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom'
import { Container, Navbar, Nav, Row, Col, ToastContainer, Toast, Card, Spinner, ListGroup, Button } from 'react-bootstrap';
import { MQTTProvider, useMQTTState } from './MQTTContext';
import { ToastProvider } from './ToastContext'
import APIBackend from './RestAPI'
import { CapturePage } from './ManualCapturePage';
import { AutoPage } from './AutoCapturePage'
import { new_message_action, custom_reducer, initial_state } from './custom_mqtt';

dayjs.extend(duration);

function App() {
  let [loaded, setLoaded] = React.useState(false)
  let [pending, setPending] = React.useState(false)
  let [error, setError] = React.useState(null)
  let [config, setConfig] = React.useState([])


  React.useEffect(() => {
    let do_load = async () => {
      setPending(true)
      let response = await APIBackend.api_get('http://' + document.location.host + '/config/config.json');
      if (response.status === 200) {
        const raw_conf = response.payload;
        console.log("config", raw_conf)
        setConfig(raw_conf)
        setLoaded(true)
      } else {
        console.log("ERROR LOADING CONFIG")
        setError("ERROR: Unable to load configuration!")
      }
    }
    if (!loaded && !pending) {
      do_load()
    }
  }, [loaded, pending])
  if (!loaded) {
    return <Container fluid="md">
      <Card className='mt-2 text-center'>
        {error !== null ? <h1>{error}</h1> : <div><Spinner></Spinner> <h2 className='d-inline'>Loading Config</h2></div>}
      </Card>
    </Container>
  } else {
    return (
      <MQTTProvider
        host={config?.mqtt?.host ?? window.location.hostname}
        port={config?.mqtt?.port ?? 9001}
        prefix={config?.mqtt?.prefix ?? []}
        new_message_action={new_message_action}
        reducer={custom_reducer}
        initial_state={initial_state}
      // debug={true}
      >
        <ToastProvider position='bottom-center'>
          <BrowserRouter>
            <Routing config={config} />
          </BrowserRouter>
        </ToastProvider>
      </MQTTProvider>
    )
  }
}


function Routing(props) {
  let [machine_list, setMachineList] = React.useState([])

  return (
    <Routes>
      <Route path='/' element={<Base machine_list={machine_list} setMachineList={setMachineList} {...props} />}>
        <Route path='/machines' element={<MachineList machine_list={machine_list} config={props.config} />} />
        <Route path='/machine/m/:machine_id' element={<CapturePage machine_list={machine_list} {...props} />} />
        <Route path='/machine/a/:machine_id' element={<AutoPage machine_list={machine_list} {...props} />} />
        <Route index element={<MachineList machine_list={machine_list} setMachineList={setMachineList} config={props.config} />}></Route>
      </Route>
    </Routes>
  )
}

function Base({ setMachineList, config }) {
  let { connected } = useMQTTState()
  let variant = "danger"
  let text = "Disconnected"
  if (connected) {
    variant = "success"
    text = "Connected"
  }

  let [loaded, setLoaded] = React.useState(false)
  let [pending, setPending] = React.useState(false)
  let [error, setError] = React.useState(null)

  React.useEffect(() => {
    let do_load = async () => {
      setPending(true)
      let url = (config.reasons_api.host ? config.reasons_api.host : window.location.hostname) + (config.reasons_api.port ? ":" + config.reasons_api.port : "")
      let response = await APIBackend.api_get('http://' + url + '/machines/');
      if (response.status === 200) {
        setMachineList(response.payload)
        setLoaded(true)
      } else {
        console.error("Unable to load list of operations")
        setError("Unable to load list of operations - please try refresh")
      }
    }
    if (!loaded && !pending) {
      do_load()
    }
  }, [loaded, pending, config, setMachineList])

  if (!loaded) {
    return <Container fluid="md">
      <Card className='mt-2 text-center'>
        {error !== null ? <h1>{error}</h1> : <Spinner></Spinner>}
      </Card>
    </Container>
  } else {
    return (
      <Container fluid className="vh-100 p-0 d-flex flex-column">
        {/* <div id='header'> */}
        <Navbar sticky="top" bg="secondary" variant="dark" expand="md">
          <Container fluid>
            <Navbar.Brand href="/">
              Shoestring Downtime Monitoring
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" className='mb-2' />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav variant="pills" className="me-auto">
                <BSNavLink to='/machines'>Machines</BSNavLink>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
        {/* </div> */}
        <Container fluid className="flex-grow-1 main-background px-1 pt-2 px-sm-2">
          <Row className="h-100 m-0 d-flex justify-content-center pt-4 pb-5">
            <Col md={10} lg={8}>
              <Outlet />
            </Col>
          </Row>
        </Container>
        <ToastContainer className="p-3" containerPosition={"fixed"} position={"bottom-end"}>
          <Toast className="p-1" bg={variant}>
            <strong>{text}</strong>
          </Toast>
        </ToastContainer>
      </Container>
    )
  }
}

function BSNavLink({ children, className, ...props }) {
  return <NavLink className={({ isActive }) => (isActive ? ("nav-link active " + className) : ("nav-link " + className))} {...props}>{children}</NavLink>
}

function MachineList({ machine_list, config }) {
  return <Container fluid="md">
    <Card className='mt-2'>
      <Card.Header className='text-center'><h1>{config?.location_page?.title}</h1></Card.Header>
      <Card.Body>
        <ListGroup>
          {machine_list.map(item => (
            <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-baseline">
              {item.name}
              <span className='flex-shrink-0'>
                <NavLink className="mx-2" to={"/machine/" + (item.sensor ? "a/" : "m/") + item.id}>
                  <Button>Go</Button>
                </NavLink>
              </span>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  </Container>
}

export default App;
