const prisma = require('../db/prisma');

const AMC_LOCK_MESSAGE = 'Please recharge AMC as soon as possible';

// Returns the lock message when the AMC has expired, otherwise null.
// The system stays valid through the end of the selected expiry date, so a date
// set to the 26th blocks login from the 27th onward.
async function getAmcLockMessage() {
  try {
    const settings = await prisma.hospitalSetting.findFirst();
    if (!settings || !settings.amcExpiryDate) return null;

    const expiry = new Date(settings.amcExpiryDate);
    const endOfDay = new Date(
      expiry.getFullYear(),
      expiry.getMonth(),
      expiry.getDate(),
      23,
      59,
      59,
      999
    );

    if (new Date() > endOfDay) return AMC_LOCK_MESSAGE;
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = { getAmcLockMessage, AMC_LOCK_MESSAGE };
