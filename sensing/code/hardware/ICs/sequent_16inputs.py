"""Driver for the Sequent Microsystems 16 input HAT

https://sequentmicrosystems.com/products/16-universal-inputs-card-for-raspberry-pi

Public API: all public methods of Sequent16inputsHAT
"""


## -- Imports ---------------------------------------------------------------------

# Standard imports
#none

# Installed inports
import smbus2

# Local imports
#none

## --------------------------------------------------------------------------------


class Sequent16inputsHAT:

    _INPUTS_STATUS_REGISTER_ADDRESS = 0

    def __init__(self, stack: int = 0, bus: int = 1):
        """Class for reading data from the Sequent Microsystems 16 input HAT.

        https://sequentmicrosystems.com/products/16-universal-inputs-card-for-raspberry-pi.
        stack (default 0): The address offset set by jumpers/DIP switches on the HAT. No jumpers = stack 0.
        bus (default 1): The number of the i2c bus the device responds on, passed to smbus2.
        """

        # Validate stack input
        if stack < 0 or stack > 7 or not isinstance(stack, int):
            raise ValueError('Invalid stack level ' + str(stack) + ' , must be int 0-7 inclusive')

        # Calculate device I2C address as offset by stack number.
        # 7 bit address (will be left shifted to add the read write bit)
        # Flip stack bits with XOR. Stack 0 has address 0x27, each stack decrements that until stack 7 is at 0x20
        self._hw_addr = 0x20 + (0x07 ^ stack)

        # Save other args
        self._bus = bus


    def read_single_channel(self, channel: int) -> int:
        """Read the status of all inputs, but return only a single bit corresponding to the specified channel.

        Here channel numbers are 1 to 16 to match the silkscreen on the hardware.
        """

        # Validate channel inputs
        if channel < 1 or channel > 16 or not isinstance(channel, int):
            raise ValueError('Invalid channel number' + str(channel), ', must be int 1-16 inclusive')

        # Read register
        status_reg = self._readbits()

        # Process result. Bits are complemented (flipped) and in reverse order.
        if status_reg & (1 << (16 - channel)) == 0:
            return 1
        else:
            return 0


    def read_multiple_channels(self, channel_numbers: list) -> list:
        """Read the status of all inputs, but return only selected ones.

        channel_numbers: List of channel numbers (1 to 16 to match the silkscreen on the hardware) to be read.
        More efficient than reading the channels individually, but easier to pass than read_all_channels().
        Returns a list of bits describing the status of each input channel, in the order of the supplied list.
        """

        # Read register
        all_status = self.read_all_channels()

        # Iterate over required channels
        ret = []
        for channel in channel_numbers:

            # Validate channel inputs
            if channel < 1 or channel > 16 or not isinstance(channel, int):
                raise ValueError('Invalid channel number' + str(channel), ', must be int 1-16 inclusive')

            # Extract status of individual channel
            if all_status & (1 << (channel - 1)):
                channel_status = 1
            else:
                channel_status = 0

            # Store
            ret.append(channel_status)

        return ret


    def read_all_channels(self) -> int:
        """Read the status of all inputs and return as a single 16-bit number.

        Lower channel numbers are less significant bits.
        """

        # Read register
        status_reg = self._readbits()

        # Process result. Bits are complemented (flipped) and in reverse order.
        ret = 0
        for i in range(16):
            if status_reg & (1 << (15 - i)) == 0:
                ret += 1 << i
        return ret


    def _readbits(self) -> int:
        """Read the raw status of the inputs.

        Returns a 16 bit number with one bit representing each input channel.
        Channel 1 is the most significant bit, channel 16 the least.
        Bit status is the complement of the voltage at the pin.
        """

        # Use a context manager to handle errors on the bus
        with smbus2.SMBus(self._bus) as i2cbus:
            status_reg = i2cbus.read_word_data(self._hw_addr, self._INPUTS_STATUS_REGISTER_ADDRESS)

        # Return a 16 bit number. Lowest channel is most significant.
        return status_reg



# Test this script if it is run directly
if __name__ == '__main__':
    from time import sleep
    myhat = Sequent16inputsHAT(0)
    for i in range(1, 17):
       print("channel", i, "is", myhat.read_single_channel(i))
       sleep(0.01)

    all = myhat.read_all_channels()
    print("all inputs are", all, bin(all))
    for i in range(16):
        print("from all, channel", i+1, "is", 1 if all & (1 << i) else 0)
    print()

    multi = myhat.read_multiple_channels([1,2,3,4])
    print("multi:", multi)
