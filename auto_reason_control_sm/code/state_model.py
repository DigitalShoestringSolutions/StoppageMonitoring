import multiprocessing
import zmq
import logging
import json
import datetime
import isodate
import random

context = zmq.Context()
logger = logging.getLogger("main.state_model")


class StateModel(multiprocessing.Process):
    def __init__(self, config, zmq_conf):
        super().__init__()

        sm_conf = config['state_model']

        # declarations
        self.zmq_conf = zmq_conf
        self.zmq_in = None
        self.zmq_out = None

        self.event_ids = {}
        self.machine_status = {}
        self.stop_times = {}

    def do_connect(self):
        self.zmq_in = context.socket(self.zmq_conf['in']['type'])
        if self.zmq_conf['in']["bind"]:
            self.zmq_in.bind(self.zmq_conf['in']["address"])
        else:
            self.zmq_in.connect(self.zmq_conf['in']["address"])

        self.zmq_out = context.socket(self.zmq_conf['out']['type'])
        if self.zmq_conf['out']["bind"]:
            self.zmq_out.bind(self.zmq_conf['out']["address"])
        else:
            self.zmq_out.connect(self.zmq_conf['out']["address"])

    def run(self):
        logger.info("Starting")
        self.do_connect()
        logger.info("ZMQ Connected")
        run = True
        while run:
            while self.zmq_in.poll(50, zmq.POLLIN):
                try:
                    msg = self.zmq_in.recv(zmq.NOBLOCK)
                    msg_json = json.loads(msg)

                    msg_topic = msg_json['topic']
                    msg_payload = msg_json['payload']
                    try:
                        out = self.handle_msg(msg_topic, msg_payload)
                    except Exception as e:
                        logger.error(e)

                    for msg in out:
                        self.zmq_out.send_json(msg)
                except zmq.ZMQError:
                    pass

    def handle_msg(self, topic, payload):
        logger.debug(f"Got {topic},{payload}")
        machine = payload.get('id', None)
        status = payload.get("running", None)

        if machine is None:
            logger.warning("Machine not specified in payload")
            return []

        if status is None:
            logger.warning("Status not specified in payload")
            return []

        if machine in self.machine_status:
            logger.debug(f"{machine} known")
            if self.machine_status[machine] != status:
                logger.debug(f"{machine} change")
                self.machine_status[machine] = status
                timestamp = payload.get("timestamp")
                if status == False:
                    logger.info(f"{machine}> Detected Stop")
                    try:
                        self.stop_times[machine] = datetime.datetime.fromisoformat(timestamp)
                    except:
                        logger.warning(f"Unable to parse timestamp {timestamp}, falling back to current timestamp")
                        self.stop_times[machine] = datetime.datetime.now(tz=datetime.timezone.utc)

                    stop_ts = self.stop_times[machine].isoformat()
                    self.event_ids[machine] = f'{random.getrandbits(32):x}'
                    return [
                        {
                            'topic': f"event_sm/{machine}",
                            'payload': {
                                'event_id': self.event_ids[machine],
                                'machine_name': machine,
                                'stop': stop_ts
                            }
                        },
                        {
                            'topic': f"auto_input/stoppages/{machine}/stopped",
                            'payload': {
                                "timestamp": stop_ts,
                                "machine_name": machine,
                                "running": False,
                                "status": "Unspecified"
                            }
                        }
                    ]
                else:
                    logger.info(f"{machine}> Detected Start")
                    stop = self.stop_times[machine]
                    try:
                        start = datetime.datetime.fromisoformat(timestamp)
                    except:
                        logger.warning(f"Unable to parse timestamp {timestamp}, falling back to current timestamp")
                        start = datetime.datetime.now(tz=datetime.timezone.utc)

                    delta = start - stop
                    start_ts = start.isoformat()

                    return [
                        {
                            'topic': f"event_sm/{machine}",
                            'payload': {
                                'event_id': self.event_ids[machine],
                                'machine_name': machine,
                                'stop': stop.isoformat(),
                                'duration': isodate.duration_isoformat(delta)
                            }
                        },
                        {
                            'topic': f"auto_input/stoppages/{machine}/running",
                            'payload': {
                                "timestamp": start_ts,
                                "machine_name": machine,
                                "running": True,
                                "status": "Running"
                            }
                        }
                    ]

            else:
                # no change - ignore
                return []

        else:
            # handle new
            self.machine_status[machine] = True

        return []
