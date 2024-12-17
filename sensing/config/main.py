"""main.py that prepares the Sensing service module (lite-v0.5.1) for Downtime Monitoring.

All configuration is done in the Settings section.
Assumes sensors have pulls external to the GPIO interface.
"""

## -- Imports ---------------------------------------------------------------------

# Standard imports
import time

# Installed inports
#none used directly, but smbus2 is used by sequent_16inputs

# Local imports
from utilities.mqtt_out import publish
from hardware.ICs.sequent_16inputs import Sequent16inputsHAT

## --------------------------------------------------------------------------------




## -- Settings  -------------------------------------------------------------------

# List of machines to be monitored by local sensors.
machines = (
# machine name, input channel number, input state when machine is active
("Machine_Name_Here", 1, 1),
("Machine_2", 3, 1),
# duplicate the above line to add more machines
)

# Timing
sample_interval = 5 # seconds between reporting on each machine

# Hardware input interface
input_interface = Sequent16inputsHAT(0)

## --------------------------------------------------------------------------------




## -- Main Loop -------------------------------------------------------------------

while True:

    for machine in machines:
        input_state = input_interface.read_single_channel(machine[1])   # Read sensor
        running = True if input_state == machine[2] else False          # Compare sensor value to config
        publish( {                                                      # Publish the following to MQTT:
            "id"      : machine[0],                                         # string machine name
            "running" : running,                                            # bool
            }, "equipment_monitoring/status/" + machine[0])                 # Topic to publish to, including machine name

    time.sleep(sample_interval)                                         # Idle between samples


## --------------------------------------------------------------------------------
