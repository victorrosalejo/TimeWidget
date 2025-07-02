// undefined v0.0.25 Copyright 2025 Iván Velasco González & John Alexis Guerra Gómez
import * as d3 from 'd3';

(function() {
    const env = {"NODE_ENV":"debug"};
    try {
        if (process) {
            process.env = Object.assign({}, process.env);
            Object.assign(process.env, env);
            return;
        }
    } catch (e) {} // avoid ReferenceError: process is not defined
    globalThis.process = { env:env };
})();

function toInteger(dirtyNumber) {
  if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
    return NaN;
  }

  var number = Number(dirtyNumber);

  if (isNaN(number)) {
    return number;
  }

  return number < 0 ? Math.ceil(number) : Math.floor(number);
}

function requiredArgs(required, args) {
  if (args.length < required) {
    throw new TypeError(required + ' argument' + (required > 1 ? 's' : '') + ' required, but only ' + args.length + ' present');
  }
}

function _typeof$2(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof$2 = function _typeof(obj) { return typeof obj; }; } else { _typeof$2 = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof$2(obj); }
/**
 * @name toDate
 * @category Common Helpers
 * @summary Convert the given argument to an instance of Date.
 *
 * @description
 * Convert the given argument to an instance of Date.
 *
 * If the argument is an instance of Date, the function returns its clone.
 *
 * If the argument is a number, it is treated as a timestamp.
 *
 * If the argument is none of the above, the function returns Invalid Date.
 *
 * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
 *
 * @param {Date|Number} argument - the value to convert
 * @returns {Date} the parsed date in the local time zone
 * @throws {TypeError} 1 argument required
 *
 * @example
 * // Clone the date:
 * const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
 * //=> Tue Feb 11 2014 11:30:30
 *
 * @example
 * // Convert the timestamp to date:
 * const result = toDate(1392098430000)
 * //=> Tue Feb 11 2014 11:30:30
 */

function toDate(argument) {
  requiredArgs(1, arguments);
  var argStr = Object.prototype.toString.call(argument); // Clone the date

  if (argument instanceof Date || _typeof$2(argument) === 'object' && argStr === '[object Date]') {
    // Prevent the date to lose the milliseconds when passed to new Date() in IE10
    return new Date(argument.getTime());
  } else if (typeof argument === 'number' || argStr === '[object Number]') {
    return new Date(argument);
  } else {
    if ((typeof argument === 'string' || argStr === '[object String]') && typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#string-arguments"); // eslint-disable-next-line no-console

      console.warn(new Error().stack);
    }

    return new Date(NaN);
  }
}

/**
 * @name addDays
 * @category Day Helpers
 * @summary Add the specified number of days to the given date.
 *
 * @description
 * Add the specified number of days to the given date.
 *
 * @param {Date|Number} date - the date to be changed
 * @param {Number} amount - the amount of days to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
 * @returns {Date} - the new date with the days added
 * @throws {TypeError} - 2 arguments required
 *
 * @example
 * // Add 10 days to 1 September 2014:
 * const result = addDays(new Date(2014, 8, 1), 10)
 * //=> Thu Sep 11 2014 00:00:00
 */

function addDays(dirtyDate, dirtyAmount) {
  requiredArgs(2, arguments);
  var date = toDate(dirtyDate);
  var amount = toInteger(dirtyAmount);

  if (isNaN(amount)) {
    return new Date(NaN);
  }

  if (!amount) {
    // If 0 days, no-op to avoid changing times in the hour before end of DST
    return date;
  }

  date.setDate(date.getDate() + amount);
  return date;
}

/**
 * @name addMonths
 * @category Month Helpers
 * @summary Add the specified number of months to the given date.
 *
 * @description
 * Add the specified number of months to the given date.
 *
 * @param {Date|Number} date - the date to be changed
 * @param {Number} amount - the amount of months to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
 * @returns {Date} the new date with the months added
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // Add 5 months to 1 September 2014:
 * const result = addMonths(new Date(2014, 8, 1), 5)
 * //=> Sun Feb 01 2015 00:00:00
 */

function addMonths(dirtyDate, dirtyAmount) {
  requiredArgs(2, arguments);
  var date = toDate(dirtyDate);
  var amount = toInteger(dirtyAmount);

  if (isNaN(amount)) {
    return new Date(NaN);
  }

  if (!amount) {
    // If 0 months, no-op to avoid changing times in the hour before end of DST
    return date;
  }

  var dayOfMonth = date.getDate(); // The JS Date object supports date math by accepting out-of-bounds values for
  // month, day, etc. For example, new Date(2020, 0, 0) returns 31 Dec 2019 and
  // new Date(2020, 13, 1) returns 1 Feb 2021.  This is *almost* the behavior we
  // want except that dates will wrap around the end of a month, meaning that
  // new Date(2020, 13, 31) will return 3 Mar 2021 not 28 Feb 2021 as desired. So
  // we'll default to the end of the desired month by adding 1 to the desired
  // month and using a date of 0 to back up one day to the end of the desired
  // month.

  var endOfDesiredMonth = new Date(date.getTime());
  endOfDesiredMonth.setMonth(date.getMonth() + amount + 1, 0);
  var daysInMonth = endOfDesiredMonth.getDate();

  if (dayOfMonth >= daysInMonth) {
    // If we're already at the end of the month, then this is the correct date
    // and we're done.
    return endOfDesiredMonth;
  } else {
    // Otherwise, we now know that setting the original day-of-month value won't
    // cause an overflow, so set the desired day-of-month. Note that we can't
    // just set the date of `endOfDesiredMonth` because that object may have had
    // its time changed in the unusual case where where a DST transition was on
    // the last day of the month and its local time was in the hour skipped or
    // repeated next to a DST transition.  So we use `date` instead which is
    // guaranteed to still have the original time.
    date.setFullYear(endOfDesiredMonth.getFullYear(), endOfDesiredMonth.getMonth(), dayOfMonth);
    return date;
  }
}

function _typeof$1(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof$1 = function _typeof(obj) { return typeof obj; }; } else { _typeof$1 = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof$1(obj); }

/**
 * @name add
 * @category Common Helpers
 * @summary Add the specified years, months, weeks, days, hours, minutes and seconds to the given date.
 *
 * @description
 * Add the specified years, months, weeks, days, hours, minutes and seconds to the given date.
 *
 * @param {Date|Number} date - the date to be changed
 * @param {Duration} duration - the object with years, months, weeks, days, hours, minutes and seconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
 *
 * | Key            | Description                        |
 * |----------------|------------------------------------|
 * | years          | Amount of years to be added        |
 * | months         | Amount of months to be added       |
 * | weeks          | Amount of weeks to be added        |
 * | days           | Amount of days to be added         |
 * | hours          | Amount of hours to be added        |
 * | minutes        | Amount of minutes to be added      |
 * | seconds        | Amount of seconds to be added      |
 *
 * All values default to 0
 *
 * @returns {Date} the new date with the seconds added
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // Add the following duration to 1 September 2014, 10:19:50
 * const result = add(new Date(2014, 8, 1, 10, 19, 50), {
 *   years: 2,
 *   months: 9,
 *   weeks: 1,
 *   days: 7,
 *   hours: 5,
 *   minutes: 9,
 *   seconds: 30,
 * })
 * //=> Thu Jun 15 2017 15:29:20
 */
function add(dirtyDate, duration) {
  requiredArgs(2, arguments);
  if (!duration || _typeof$1(duration) !== 'object') return new Date(NaN);
  var years = duration.years ? toInteger(duration.years) : 0;
  var months = duration.months ? toInteger(duration.months) : 0;
  var weeks = duration.weeks ? toInteger(duration.weeks) : 0;
  var days = duration.days ? toInteger(duration.days) : 0;
  var hours = duration.hours ? toInteger(duration.hours) : 0;
  var minutes = duration.minutes ? toInteger(duration.minutes) : 0;
  var seconds = duration.seconds ? toInteger(duration.seconds) : 0; // Add years and months

  var date = toDate(dirtyDate);
  var dateWithMonths = months || years ? addMonths(date, months + years * 12) : date; // Add weeks and days

  var dateWithDays = days || weeks ? addDays(dateWithMonths, days + weeks * 7) : dateWithMonths; // Add days, hours, minutes and seconds

  var minutesToAdd = minutes + hours * 60;
  var secondsToAdd = seconds + minutesToAdd * 60;
  var msToAdd = secondsToAdd * 1000;
  var finalDate = new Date(dateWithDays.getTime() + msToAdd);
  return finalDate;
}

/**
 * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
 * They usually appear for dates that denote time before the timezones were introduced
 * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
 * and GMT+01:00:00 after that date)
 *
 * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
 * which would lead to incorrect calculations.
 *
 * This function returns the timezone offset in milliseconds that takes seconds in account.
 */
function getTimezoneOffsetInMilliseconds(date) {
  var utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()));
  utcDate.setUTCFullYear(date.getFullYear());
  return date.getTime() - utcDate.getTime();
}

/**
 * @name startOfDay
 * @category Day Helpers
 * @summary Return the start of a day for the given date.
 *
 * @description
 * Return the start of a day for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|Number} date - the original date
 * @returns {Date} the start of a day
 * @throws {TypeError} 1 argument required
 *
 * @example
 * // The start of a day for 2 September 2014 11:55:00:
 * const result = startOfDay(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Sep 02 2014 00:00:00
 */

function startOfDay(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  date.setHours(0, 0, 0, 0);
  return date;
}

var MILLISECONDS_IN_DAY = 86400000;
/**
 * @name differenceInCalendarDays
 * @category Day Helpers
 * @summary Get the number of calendar days between the given dates.
 *
 * @description
 * Get the number of calendar days between the given dates. This means that the times are removed
 * from the dates and then the difference in days is calculated.
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @returns {Number} the number of calendar days
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many calendar days are between
 * // 2 July 2011 23:00:00 and 2 July 2012 00:00:00?
 * const result = differenceInCalendarDays(
 *   new Date(2012, 6, 2, 0, 0),
 *   new Date(2011, 6, 2, 23, 0)
 * )
 * //=> 366
 * // How many calendar days are between
 * // 2 July 2011 23:59:00 and 3 July 2011 00:01:00?
 * const result = differenceInCalendarDays(
 *   new Date(2011, 6, 3, 0, 1),
 *   new Date(2011, 6, 2, 23, 59)
 * )
 * //=> 1
 */

function differenceInCalendarDays(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var startOfDayLeft = startOfDay(dirtyDateLeft);
  var startOfDayRight = startOfDay(dirtyDateRight);
  var timestampLeft = startOfDayLeft.getTime() - getTimezoneOffsetInMilliseconds(startOfDayLeft);
  var timestampRight = startOfDayRight.getTime() - getTimezoneOffsetInMilliseconds(startOfDayRight); // Round the number of days to the nearest integer
  // because the number of milliseconds in a day is not constant
  // (e.g. it's different in the day of the daylight saving time clock shift)

  return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_DAY);
}

/**
 * @name compareAsc
 * @category Common Helpers
 * @summary Compare the two dates and return -1, 0 or 1.
 *
 * @description
 * Compare the two dates and return 1 if the first date is after the second,
 * -1 if the first date is before the second or 0 if dates are equal.
 *
 * @param {Date|Number} dateLeft - the first date to compare
 * @param {Date|Number} dateRight - the second date to compare
 * @returns {Number} the result of the comparison
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // Compare 11 February 1987 and 10 July 1989:
 * const result = compareAsc(new Date(1987, 1, 11), new Date(1989, 6, 10))
 * //=> -1
 *
 * @example
 * // Sort the array of dates:
 * const result = [
 *   new Date(1995, 6, 2),
 *   new Date(1987, 1, 11),
 *   new Date(1989, 6, 10)
 * ].sort(compareAsc)
 * //=> [
 * //   Wed Feb 11 1987 00:00:00,
 * //   Mon Jul 10 1989 00:00:00,
 * //   Sun Jul 02 1995 00:00:00
 * // ]
 */

function compareAsc(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var diff = dateLeft.getTime() - dateRight.getTime();

  if (diff < 0) {
    return -1;
  } else if (diff > 0) {
    return 1; // Return 0 if diff is 0; return NaN if diff is NaN
  } else {
    return diff;
  }
}

/**
 * Milliseconds in 1 minute
 *
 * @name millisecondsInMinute
 * @constant
 * @type {number}
 * @default
 */

var millisecondsInMinute = 60000;
/**
 * Milliseconds in 1 hour
 *
 * @name millisecondsInHour
 * @constant
 * @type {number}
 * @default
 */

var millisecondsInHour = 3600000;

/**
 * @name differenceInCalendarMonths
 * @category Month Helpers
 * @summary Get the number of calendar months between the given dates.
 *
 * @description
 * Get the number of calendar months between the given dates.
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @returns {Number} the number of calendar months
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many calendar months are between 31 January 2014 and 1 September 2014?
 * const result = differenceInCalendarMonths(
 *   new Date(2014, 8, 1),
 *   new Date(2014, 0, 31)
 * )
 * //=> 8
 */

function differenceInCalendarMonths(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var yearDiff = dateLeft.getFullYear() - dateRight.getFullYear();
  var monthDiff = dateLeft.getMonth() - dateRight.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * @name differenceInCalendarYears
 * @category Year Helpers
 * @summary Get the number of calendar years between the given dates.
 *
 * @description
 * Get the number of calendar years between the given dates.
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @returns {Number} the number of calendar years
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many calendar years are between 31 December 2013 and 11 February 2015?
 * const result = differenceInCalendarYears(
 *   new Date(2015, 1, 11),
 *   new Date(2013, 11, 31)
 * )
 * //=> 2
 */

function differenceInCalendarYears(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  return dateLeft.getFullYear() - dateRight.getFullYear();
}

// for accurate equality comparisons of UTC timestamps that end up
// having the same representation in local time, e.g. one hour before
// DST ends vs. the instant that DST ends.

function compareLocalAsc(dateLeft, dateRight) {
  var diff = dateLeft.getFullYear() - dateRight.getFullYear() || dateLeft.getMonth() - dateRight.getMonth() || dateLeft.getDate() - dateRight.getDate() || dateLeft.getHours() - dateRight.getHours() || dateLeft.getMinutes() - dateRight.getMinutes() || dateLeft.getSeconds() - dateRight.getSeconds() || dateLeft.getMilliseconds() - dateRight.getMilliseconds();

  if (diff < 0) {
    return -1;
  } else if (diff > 0) {
    return 1; // Return 0 if diff is 0; return NaN if diff is NaN
  } else {
    return diff;
  }
}
/**
 * @name differenceInDays
 * @category Day Helpers
 * @summary Get the number of full days between the given dates.
 *
 * @description
 * Get the number of full day periods between two dates. Fractional days are
 * truncated towards zero.
 *
 * One "full day" is the distance between a local time in one day to the same
 * local time on the next or previous day. A full day can sometimes be less than
 * or more than 24 hours if a daylight savings change happens between two dates.
 *
 * To ignore DST and only measure exact 24-hour periods, use this instead:
 * `Math.floor(differenceInHours(dateLeft, dateRight)/24)|0`.
 *
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @returns {Number} the number of full days according to the local timezone
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many full days are between
 * // 2 July 2011 23:00:00 and 2 July 2012 00:00:00?
 * const result = differenceInDays(
 *   new Date(2012, 6, 2, 0, 0),
 *   new Date(2011, 6, 2, 23, 0)
 * )
 * //=> 365
 * // How many full days are between
 * // 2 July 2011 23:59:00 and 3 July 2011 00:01:00?
 * const result = differenceInDays(
 *   new Date(2011, 6, 3, 0, 1),
 *   new Date(2011, 6, 2, 23, 59)
 * )
 * //=> 0
 * // How many full days are between
 * // 1 March 2020 0:00 and 1 June 2020 0:00 ?
 * // Note: because local time is used, the
 * // result will always be 92 days, even in
 * // time zones where DST starts and the
 * // period has only 92*24-1 hours.
 * const result = differenceInDays(
 *   new Date(2020, 5, 1),
 *   new Date(2020, 2, 1)
 * )
//=> 92
 */


function differenceInDays(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var sign = compareLocalAsc(dateLeft, dateRight);
  var difference = Math.abs(differenceInCalendarDays(dateLeft, dateRight));
  dateLeft.setDate(dateLeft.getDate() - sign * difference); // Math.abs(diff in full days - diff in calendar days) === 1 if last calendar day is not full
  // If so, result must be decreased by 1 in absolute value

  var isLastDayNotFull = Number(compareLocalAsc(dateLeft, dateRight) === -sign);
  var result = sign * (difference - isLastDayNotFull); // Prevent negative zero

  return result === 0 ? 0 : result;
}

/**
 * @name differenceInMilliseconds
 * @category Millisecond Helpers
 * @summary Get the number of milliseconds between the given dates.
 *
 * @description
 * Get the number of milliseconds between the given dates.
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @returns {Number} the number of milliseconds
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many milliseconds are between
 * // 2 July 2014 12:30:20.600 and 2 July 2014 12:30:21.700?
 * const result = differenceInMilliseconds(
 *   new Date(2014, 6, 2, 12, 30, 21, 700),
 *   new Date(2014, 6, 2, 12, 30, 20, 600)
 * )
 * //=> 1100
 */

function differenceInMilliseconds(dateLeft, dateRight) {
  requiredArgs(2, arguments);
  return toDate(dateLeft).getTime() - toDate(dateRight).getTime();
}

var roundingMap = {
  ceil: Math.ceil,
  round: Math.round,
  floor: Math.floor,
  trunc: function trunc(value) {
    return value < 0 ? Math.ceil(value) : Math.floor(value);
  } // Math.trunc is not supported by IE

};
var defaultRoundingMethod = 'trunc';
function getRoundingMethod(method) {
  return method ? roundingMap[method] : roundingMap[defaultRoundingMethod];
}

/**
 * @name differenceInHours
 * @category Hour Helpers
 * @summary Get the number of hours between the given dates.
 *
 * @description
 * Get the number of hours between the given dates.
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @param {Object} [options] - an object with options.
 * @param {String} [options.roundingMethod='trunc'] - a rounding method (`ceil`, `floor`, `round` or `trunc`)
 * @returns {Number} the number of hours
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many hours are between 2 July 2014 06:50:00 and 2 July 2014 19:00:00?
 * const result = differenceInHours(
 *   new Date(2014, 6, 2, 19, 0),
 *   new Date(2014, 6, 2, 6, 50)
 * )
 * //=> 12
 */

function differenceInHours(dateLeft, dateRight, options) {
  requiredArgs(2, arguments);
  var diff = differenceInMilliseconds(dateLeft, dateRight) / millisecondsInHour;
  return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
}

/**
 * @name differenceInMinutes
 * @category Minute Helpers
 * @summary Get the number of minutes between the given dates.
 *
 * @description
 * Get the signed number of full (rounded towards 0) minutes between the given dates.
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @param {Object} [options] - an object with options.
 * @param {String} [options.roundingMethod='trunc'] - a rounding method (`ceil`, `floor`, `round` or `trunc`)
 * @returns {Number} the number of minutes
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many minutes are between 2 July 2014 12:07:59 and 2 July 2014 12:20:00?
 * const result = differenceInMinutes(
 *   new Date(2014, 6, 2, 12, 20, 0),
 *   new Date(2014, 6, 2, 12, 7, 59)
 * )
 * //=> 12
 *
 * @example
 * // How many minutes are between 10:01:59 and 10:00:00
 * const result = differenceInMinutes(
 *   new Date(2000, 0, 1, 10, 0, 0),
 *   new Date(2000, 0, 1, 10, 1, 59)
 * )
 * //=> -1
 */

function differenceInMinutes(dateLeft, dateRight, options) {
  requiredArgs(2, arguments);
  var diff = differenceInMilliseconds(dateLeft, dateRight) / millisecondsInMinute;
  return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
}

/**
 * @name endOfDay
 * @category Day Helpers
 * @summary Return the end of a day for the given date.
 *
 * @description
 * Return the end of a day for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|Number} date - the original date
 * @returns {Date} the end of a day
 * @throws {TypeError} 1 argument required
 *
 * @example
 * // The end of a day for 2 September 2014 11:55:00:
 * const result = endOfDay(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Sep 02 2014 23:59:59.999
 */

function endOfDay(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * @name endOfMonth
 * @category Month Helpers
 * @summary Return the end of a month for the given date.
 *
 * @description
 * Return the end of a month for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|Number} date - the original date
 * @returns {Date} the end of a month
 * @throws {TypeError} 1 argument required
 *
 * @example
 * // The end of a month for 2 September 2014 11:55:00:
 * const result = endOfMonth(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Sep 30 2014 23:59:59.999
 */

function endOfMonth(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  var month = date.getMonth();
  date.setFullYear(date.getFullYear(), month + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * @name isLastDayOfMonth
 * @category Month Helpers
 * @summary Is the given date the last day of a month?
 *
 * @description
 * Is the given date the last day of a month?
 *
 * @param {Date|Number} date - the date to check
 * @returns {Boolean} the date is the last day of a month
 * @throws {TypeError} 1 argument required
 *
 * @example
 * // Is 28 February 2014 the last day of a month?
 * const result = isLastDayOfMonth(new Date(2014, 1, 28))
 * //=> true
 */

function isLastDayOfMonth(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  return endOfDay(date).getTime() === endOfMonth(date).getTime();
}

/**
 * @name differenceInMonths
 * @category Month Helpers
 * @summary Get the number of full months between the given dates.
 *
 * @description
 * Get the number of full months between the given dates using trunc as a default rounding method.
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @returns {Number} the number of full months
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many full months are between 31 January 2014 and 1 September 2014?
 * const result = differenceInMonths(new Date(2014, 8, 1), new Date(2014, 0, 31))
 * //=> 7
 */

function differenceInMonths(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var sign = compareAsc(dateLeft, dateRight);
  var difference = Math.abs(differenceInCalendarMonths(dateLeft, dateRight));
  var result; // Check for the difference of less than month

  if (difference < 1) {
    result = 0;
  } else {
    if (dateLeft.getMonth() === 1 && dateLeft.getDate() > 27) {
      // This will check if the date is end of Feb and assign a higher end of month date
      // to compare it with Jan
      dateLeft.setDate(30);
    }

    dateLeft.setMonth(dateLeft.getMonth() - sign * difference); // Math.abs(diff in full months - diff in calendar months) === 1 if last calendar month is not full
    // If so, result must be decreased by 1 in absolute value

    var isLastMonthNotFull = compareAsc(dateLeft, dateRight) === -sign; // Check for cases of one full calendar month

    if (isLastDayOfMonth(toDate(dirtyDateLeft)) && difference === 1 && compareAsc(dirtyDateLeft, dateRight) === 1) {
      isLastMonthNotFull = false;
    }

    result = sign * (difference - Number(isLastMonthNotFull));
  } // Prevent negative zero


  return result === 0 ? 0 : result;
}

/**
 * @name differenceInSeconds
 * @category Second Helpers
 * @summary Get the number of seconds between the given dates.
 *
 * @description
 * Get the number of seconds between the given dates.
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @param {Object} [options] - an object with options.
 * @param {String} [options.roundingMethod='trunc'] - a rounding method (`ceil`, `floor`, `round` or `trunc`)
 * @returns {Number} the number of seconds
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many seconds are between
 * // 2 July 2014 12:30:07.999 and 2 July 2014 12:30:20.000?
 * const result = differenceInSeconds(
 *   new Date(2014, 6, 2, 12, 30, 20, 0),
 *   new Date(2014, 6, 2, 12, 30, 7, 999)
 * )
 * //=> 12
 */

function differenceInSeconds(dateLeft, dateRight, options) {
  requiredArgs(2, arguments);
  var diff = differenceInMilliseconds(dateLeft, dateRight) / 1000;
  return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
}

/**
 * @name differenceInYears
 * @category Year Helpers
 * @summary Get the number of full years between the given dates.
 *
 * @description
 * Get the number of full years between the given dates.
 *
 * @param {Date|Number} dateLeft - the later date
 * @param {Date|Number} dateRight - the earlier date
 * @returns {Number} the number of full years
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // How many full years are between 31 December 2013 and 11 February 2015?
 * const result = differenceInYears(new Date(2015, 1, 11), new Date(2013, 11, 31))
 * //=> 1
 */

function differenceInYears(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var sign = compareAsc(dateLeft, dateRight);
  var difference = Math.abs(differenceInCalendarYears(dateLeft, dateRight)); // Set both dates to a valid leap year for accurate comparison when dealing
  // with leap days

  dateLeft.setFullYear(1584);
  dateRight.setFullYear(1584); // Math.abs(diff in full years - diff in calendar years) === 1 if last calendar year is not full
  // If so, result must be decreased by 1 in absolute value

  var isLastYearNotFull = compareAsc(dateLeft, dateRight) === -sign;
  var result = sign * (difference - Number(isLastYearNotFull)); // Prevent negative zero

  return result === 0 ? 0 : result;
}

/**
 * @name intervalToDuration
 * @category Common Helpers
 * @summary Convert interval to duration
 *
 * @description
 * Convert a interval object to a duration object.
 *
 * @param {Interval} interval - the interval to convert to duration
 *
 * @returns {Duration} The duration Object
 * @throws {TypeError} Requires 2 arguments
 * @throws {RangeError} `start` must not be Invalid Date
 * @throws {RangeError} `end` must not be Invalid Date
 *
 * @example
 * // Get the duration between January 15, 1929 and April 4, 1968.
 * intervalToDuration({
 *   start: new Date(1929, 0, 15, 12, 0, 0),
 *   end: new Date(1968, 3, 4, 19, 5, 0)
 * })
 * // => { years: 39, months: 2, days: 20, hours: 7, minutes: 5, seconds: 0 }
 */

function intervalToDuration(interval) {
  requiredArgs(1, arguments);
  var start = toDate(interval.start);
  var end = toDate(interval.end);
  if (isNaN(start.getTime())) throw new RangeError('Start Date is invalid');
  if (isNaN(end.getTime())) throw new RangeError('End Date is invalid');
  var duration = {};
  duration.years = Math.abs(differenceInYears(end, start));
  var sign = compareAsc(end, start);
  var remainingMonths = add(start, {
    years: sign * duration.years
  });
  duration.months = Math.abs(differenceInMonths(end, remainingMonths));
  var remainingDays = add(remainingMonths, {
    months: sign * duration.months
  });
  duration.days = Math.abs(differenceInDays(end, remainingDays));
  var remainingHours = add(remainingDays, {
    days: sign * duration.days
  });
  duration.hours = Math.abs(differenceInHours(end, remainingHours));
  var remainingMinutes = add(remainingHours, {
    hours: sign * duration.hours
  });
  duration.minutes = Math.abs(differenceInMinutes(end, remainingMinutes));
  var remainingSeconds = add(remainingMinutes, {
    minutes: sign * duration.minutes
  });
  duration.seconds = Math.abs(differenceInSeconds(end, remainingSeconds));
  return duration;
}

/**
 * @name subDays
 * @category Day Helpers
 * @summary Subtract the specified number of days from the given date.
 *
 * @description
 * Subtract the specified number of days from the given date.
 *
 * @param {Date|Number} date - the date to be changed
 * @param {Number} amount - the amount of days to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
 * @returns {Date} the new date with the days subtracted
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // Subtract 10 days from 1 September 2014:
 * const result = subDays(new Date(2014, 8, 1), 10)
 * //=> Fri Aug 22 2014 00:00:00
 */

function subDays(dirtyDate, dirtyAmount) {
  requiredArgs(2, arguments);
  var amount = toInteger(dirtyAmount);
  return addDays(dirtyDate, -amount);
}

/**
 * @name subMonths
 * @category Month Helpers
 * @summary Subtract the specified number of months from the given date.
 *
 * @description
 * Subtract the specified number of months from the given date.
 *
 * @param {Date|Number} date - the date to be changed
 * @param {Number} amount - the amount of months to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
 * @returns {Date} the new date with the months subtracted
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // Subtract 5 months from 1 February 2015:
 * const result = subMonths(new Date(2015, 1, 1), 5)
 * //=> Mon Sep 01 2014 00:00:00
 */

function subMonths(dirtyDate, dirtyAmount) {
  requiredArgs(2, arguments);
  var amount = toInteger(dirtyAmount);
  return addMonths(dirtyDate, -amount);
}

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }
/**
 * @name sub
 * @category Common Helpers
 * @summary Subtract the specified years, months, weeks, days, hours, minutes and seconds from the given date.
 *
 * @description
 * Subtract the specified years, months, weeks, days, hours, minutes and seconds from the given date.
 *
 * @param {Date|Number} date - the date to be changed
 * @param {Duration} duration - the object with years, months, weeks, days, hours, minutes and seconds to be subtracted
 *
 * | Key     | Description                        |
 * |---------|------------------------------------|
 * | years   | Amount of years to be subtracted   |
 * | months  | Amount of months to be subtracted  |
 * | weeks   | Amount of weeks to be subtracted   |
 * | days    | Amount of days to be subtracted    |
 * | hours   | Amount of hours to be subtracted   |
 * | minutes | Amount of minutes to be subtracted |
 * | seconds | Amount of seconds to be subtracted |
 *
 * All values default to 0
 *
 * @returns {Date} the new date with the seconds subtracted
 * @throws {TypeError} 2 arguments required
 *
 * @example
 * // Subtract the following duration from 15 June 2017 15:29:20
 * const result = sub(new Date(2017, 5, 15, 15, 29, 20), {
 *   years: 2,
 *   months: 9,
 *   weeks: 1,
 *   days: 7,
 *   hours: 5,
 *   minutes: 9,
 *   seconds: 30
 * })
 * //=> Mon Sep 1 2014 10:19:50
 */

function sub(date, duration) {
  requiredArgs(2, arguments);
  if (!duration || _typeof(duration) !== 'object') return new Date(NaN);
  var years = duration.years ? toInteger(duration.years) : 0;
  var months = duration.months ? toInteger(duration.months) : 0;
  var weeks = duration.weeks ? toInteger(duration.weeks) : 0;
  var days = duration.days ? toInteger(duration.days) : 0;
  var hours = duration.hours ? toInteger(duration.hours) : 0;
  var minutes = duration.minutes ? toInteger(duration.minutes) : 0;
  var seconds = duration.seconds ? toInteger(duration.seconds) : 0; // Subtract years and months

  var dateWithoutMonths = subMonths(date, months + years * 12); // Subtract weeks and days

  var dateWithoutDays = subDays(dateWithoutMonths, days + weeks * 7); // Subtract hours, minutes and seconds

  var minutestoSub = minutes + hours * 60;
  var secondstoSub = seconds + minutestoSub * 60;
  var mstoSub = secondstoSub * 1000;
  var finalDate = new Date(dateWithoutDays.getTime() - mstoSub);
  return finalDate;
}

let before = 0;

function log() {
  console.log(performance.now() - before, ...arguments);
  before = performance.now();
}

function darken(color, k = 1) {
  const { l, c, h } = d3.lch(color);
  return d3.lch(l - 18 * k, c, h);
}

function compareSets(set1, set2) {
  if (set1 === set2) return true;
  if (set1 === null) return false;
  if (set2 === null) return false;

  if (set1.size !== set2.size) return false;

  for (const val of set1) {
    if (!set2.has(val)) {
      return false;
    }
  }
  return true;
}

function isInsideDomain(domain, scaleX, scaleY) {
  let scaleXDomain = scaleX.domain();
  let scaleYDomain = scaleY.domain();
  let domainX = [domain[0][0], domain[1][0]];
  let domainY = [domain[1][1], domain[0][1]];

  return (
    domainX[0] > scaleXDomain[0] &&
    domainX[1] < scaleXDomain[1] &&
    domainY[0] > scaleYDomain[0] &&
    domainY[1] < scaleYDomain[1]
  );
}

const eventType = Object.freeze({
  changeSelection: "changeSelection",
  addBrushGroup: "newBrushGroup",
  removeBrushGroup: "deleteBrushGroup",
  selectBrushGroup: "selectBrushGroup",
  changeNonSelected: "changeNonSelected",
  changeBrushGroupState: "changeBrushGroupState",
  deselectAllBrushes: "deselectAllBrushes",
  highlightSelection: "highlightSelection",
  update: "update",
});

const BrushModes = Object.freeze({
  Intersect: "intersect",
  Contains: "contains",
});

const BrushAggregation = Object.freeze({
  And: "and",
  Or: "OR",
});

// import {log} from "./utils.js";

function Timeline({
  points = [],
  width = 600,
  height = 300,
  margin = { top: 10, left: 40, right: 10, bottom: 10 },
  xScale = d3.scaleLinear().range([0, width]),
  yScale = d3.scaleLinear().range([height, 0]),
  x = (d) => d[0],
  y = (d) => d[1],
  line = d3.line(),
  title = "",
  target = null, // where to draw it
  renderer = "canvas",
  pointRadius = 1.5,
  strokeColor = "#777",
} = {}) {
  let div = (target ? d3.select(target) : d3.create("div"))
    .attr("class", "details")
    .style("position", "relative");

  // cleanup
  div.selectAll("*").remove();

  let canvas = div
    .append("canvas")
    .style("position", "absolute")
    .style("top", `${margin.top}px`)
    .style("left", `${margin.left}px`)
    .style("height", height + "px")
    .style("width", width + "px")
    .style("pointer-events", "none");
  let context = canvas.node().getContext("2d");

  // https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
  const scale = window.devicePixelRatio || 1;
  canvas
    .attr("height", Math.floor(height * scale))
    .attr("width", Math.floor(width * scale));
  // Normalize coordinate system to use CSS pixels.
  context.scale(scale, scale);

  let g = div
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("height", height)
    .attr("width", width)
    .append("g")
    .attr("class", "gDrawing")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  g.append("g")
    .attr("class", "detailsYAxis")
    .call(d3.axisLeft(yScale).ticks(Math.floor(height / 30)));

  g.append("g")
    .attr("class", "detailsXAxis")
    .call(d3.axisBottom(xScale))
    .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`);

  g.append("text")
    .text(title)
    .attr("transform", "translate(10, 0)")
    .style("fill", strokeColor)
    .style("font-size", "0.7em");

  if (renderer.toUpperCase() == "SVG") {
    g.append("path")
      .attr("d", line(points))
      .style("fill", "none")
      .style("stroke", strokeColor);

    g.append("points")
      .selectAll("circle")
      .data(points)
      .join("circle")
      .attr("cx", (d) => xScale(x(d)))
      .attr("cx", (d) => xScale(x(d)))
      .attr("r", pointRadius)
      .attr("stroke", strokeColor);
  } else {
    let path = new Path2D(line(points));
    context.strokeStyle = strokeColor;
    context.stroke(path);

    context.beginPath();
    for (let p of points) {
      context.moveTo(xScale(x(p))+ pointRadius, yScale(y(p)) + pointRadius);
      context.arc(xScale(x(p)), yScale(y(p)), pointRadius, 0, 2 * Math.PI);
    }

    context.stroke();
  }

  return div;
}

function TimelineDetails({
  ts,
  detailsElement,
  detailsContainerHeight,
  detailsWidth,
  maxDetailsRecords,
  detailsHeight,
  x,
  y,
  margin = {left: 50, top: 10, bottom: 20, right: 0},
} = {}) {
  const me = {};
  let prerenderDetails = new Map();

  const divDetails = d3
    .select(detailsElement)
    .attr("id", "detail")
    .style("height", `${detailsContainerHeight}px`)
    .style("width", `${detailsWidth}px`)
    .style("overflow-y", "scroll")
    .node();

  const line = d3.line().defined((d) => y(d) !== undefined && y(d) !== null);

  let detailsX, detailsY;

  me.setScales = function ({overviewX, overviewY}) {
    detailsX = overviewX.copy();
    detailsX.range([0, detailsWidth - margin.right - margin.left]);

    detailsY = overviewY.copy();
    detailsY.range([detailsHeight - margin.top - margin.bottom, 0])
      .nice()
      .clamp(true);

    line.x((d) => detailsX(+x(d))).y((d) => detailsY(y(d)));
  };

  // ts.observer = new IntersectionObserver(onDetailsScrolled, {
  //   root: divDetails,
  //   threshold: 0.1,
  // });

  me.generatePrerenderDetails = function (data) {
    prerenderDetails = new Map();
    // log("Prerendering Details:...");
    // data.forEach((d) => {
    //   const div = Timeline({
    //     width: detailsWidth,
    //     height: detailsHeight,
    //     margin: margin,
    //     yScale: detailsY,
    //     xScale: detailsX,
    //     title: d[0],
    //     points: d[1],
    //     line: line,
    //   });

    //   prerenderDetails.set(d[0], div);
    // });

    // log("Prerendering Details: done", prerenderDetails);
    return prerenderDetails;
  };

  // function onDetailsScrolled(entries) {
  //   log("onDetailsScrolled ", entries);
  //   entries.forEach((entry) => {
  //     if (entry.isIntersecting) {
  //       let div = entry.target;
  //       let group = div.getAttribute("group");
  //       // group = typeof groupedData[0][0] === "number" ? +group : group;
  //       const prerenderDetailsEle = prerenderDetails.get(group);
  //       if (!prerenderDetailsEle) {
  //         console.log(
  //           "Error onDetailsScrolled couldn't find ",
  //           group,
  //           " on ",
  //           prerenderDetails
  //         );
  //         return;
  //       }
  //       div.appendChild(prerenderDetailsEle.node());
  //     } else {
  //       entry.target.innerHTML = "";
  //     }
  //   });
  // }

  function renderDetailsCanvas({data, brushGroupSelected}) {
    // let frag = document.createDocumentFragment();

    let slicedData = maxDetailsRecords
      ? data.get(brushGroupSelected).slice(0, maxDetailsRecords)
      : data.get(brushGroupSelected);

    // log("renderDetailsCanvas", brushGroupSelected, data, slicedData);

    divDetails.innerHTML = "";
    d3.select(divDetails)
      .selectAll("div.detailsContainer")
      .data(slicedData, (d) => d[0])
      .join("div")
      .attr("class", "detailsContainer")
      .attr("group", (d) => d[0])
      .each(function (d) {
        Timeline({
          target: this,
          width: detailsWidth,
          height: detailsHeight,
          margin,
          yScale: detailsY,
          xScale: detailsX,
          x,
          y,
          title: d[0],
          points: d[1],
          line: line,
        });
      });

    // for (let d of slicedData) {
    //   // let div = document.createElement("div");
    //   div.node().className = "detailsContainer";
    //   div.node().setAttribute("group", d[0]);
    //   // div.style.height = `${detailsHeight}px`;
    //   // frag.appendChild(div);

    //   divDetails.appendChild(div.node());
    // }

    // removed to reduce flickering
    // divDetails.innerHTML = "";

    // Observer API To only show in the details view the divs that are visible
    // window.requestIdleCallback(() => {
    //   divDetails.replaceChildren(frag);
    //   divDetails.querySelectorAll(".detailsContainer").forEach((d) => {
    //     ts.observer.observe(d);
    //   });
    // });
  }

  // function createDetailsChart(d) {
  //   let g = d3
  //     .select(this)
  //     .append("svg")
  //     .attr("class", "details")
  //     .attr("viewBox", [0, 0, detailsWidth, detailsHeight])
  //     .attr("height", detailsHeight)
  //     .attr("width", detailsWidth)
  //     .append("g");
  //   g.attr("transform", `translate(${margin.left}, ${margin.top})`);

  //   g.append("g")
  //     .attr("class", "mainYAxis")
  //     .call(d3.axisLeft(detailsY).ticks(Math.floor(detailsHeight / 20)));

  //   g.append("g")
  //     .attr("class", "mainXAxis")
  //     .call(d3.axisBottom(detailsX))
  //     .attr(
  //       "transform",
  //       `translate(0, ${detailsHeight - margin.top - margin.bottom})`
  //     );

  //   g.append("text")
  //     .text(d[0])
  //     .attr("transform", "translate(10, 0)")
  //     .style("fill", "black")
  //     .style("font-size", "0.7em");

  //   g.selectAll(".point") //.select("#points") //TODO make new G with id for this cricles
  //     .data(d[1])
  //     .join("circle")
  //     .attr("class", "point")
  //     .attr("cy", (d) => detailsY(y(d)))
  //     .attr("cx", (d) => detailsX(x(d)))
  //     .attr("fill", "black")
  //     .attr("r", 2);

  //   g.selectAll(".lines") //TODO add to the new G
  //     .data([d])
  //     .join("path")
  //     .attr("class", "line")
  //     .attr("d", (g) => line(g[1]))
  //     .style("fill", "none")
  //     .style("stroke", "black");
  // }

  // me.renderDetailsSVG = function (data) {
  //   const div = d3.select(divDetails);

  //   let slicedData = maxDetailsRecords
  //     ? data.slice(0, maxDetailsRecords)
  //     : data;

  //   div
  //     .selectAll(".details")
  //     .data(slicedData, (d) => d[0])
  //     .join("div")
  //     .each(createDetailsChart);
  // };

  me.render = ({data, brushGroupSelected}) =>
    renderDetailsCanvas({data, brushGroupSelected});

  return me;
}

function TimeLineOverview({
  ts,
  element,
  width = 800,
  height = 600,
  x,
  y,
  groupAttr,
}) {
  let me = {};
  let paths, overviewX, overviewY;

  const divOverview = d3
    .select(element)
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("position", "relative")
    .style("top", "0px")
    .style("left", "0px")
    .style("background-color", ts.backgroundColor);

  let line = d3.line()
    .defined((d) => y(d) !== undefined && y(d) !== null);
  
  let linem = d3.line();

  const canvas = divOverview
    .selectAll("canvas")
    .data([1])
    .join("canvas")
    .attr("height", height * window.devicePixelRatio)
    .attr("width", width * window.devicePixelRatio)
    .style("position", "absolute")
    .style("z-index", "-1")
    .style("top", `${ts.margin.top}px`)
    .style("left", `${ts.margin.left}px`)
    .style("width", `${width}px`)
    .style("height", `${height}px`)
    .style("pointer-events", "none");

  const context = canvas.node().getContext("2d");
  context.scale(window.devicePixelRatio, window.devicePixelRatio);
  //context.globalCompositeOperation = "lighter";

  me.data = function (data) {
    paths = new Map();
    data.forEach((d) => {
      let group = groupAttr ? groupAttr(d[1][0]) : null;
      let pathObject = { path: new Path2D(line(d[1])), group: group };
      paths.set(d[0], pathObject);
    });
  };

  me.setScales = function ({ scaleX, scaleY }) {
    overviewX = scaleX;
    overviewY = scaleY;

    line = line.x((d) => overviewX(+x(d))).y((d) => overviewY(y(d)));
    linem = linem.x((d) => overviewX(d[0])).y((d) => overviewY(d[1]));
  };

  function renderOvwerview(
    dataSelected,
    groupSelected,
    dataNotSelected,
    medians,
    hasSelection,
    childSelections = [],
    childPosition,
    otherSelectionToHightlight
  ) {
    dataNotSelected = dataNotSelected ? dataNotSelected : [];
    context.clearRect(0, 0, canvas.node().width, canvas.node().height);

    if (!hasSelection) {
      // Render all
      renderOverviewCanvasSubset(
        dataNotSelected,
        ts.defaultAlpha,
        ts.defaultColor
      );
    } else {
      context.lineWidth = 1;

      // Render Non selected
      renderOverviewCanvasSubset(
        dataNotSelected,
        ts.noSelectedAlpha,
        ts.noSelectedColor
      );

      dataSelected.forEach((data, group) => {
        if (group !== groupSelected) {
          let selectedColor = computeColor(group, childPosition);
          console.log(
            "Render selected selectedColor",
            selectedColor,
            group,
            childPosition
          );

          // Render selected
          renderOverviewCanvasSubset(
            data,
            ts.selectedAlpha,
            selectedColor.toString(),
            group
          );
        }
      });

      renderOverviewCanvasSubset(
        dataSelected.get(groupSelected),
        ts.selectedAlpha,
        computeColor(groupSelected, childPosition).toString(),
        groupSelected
      );

      // TODO configs for this
      /*childSelections.forEach((selection, childIx) => {
      if (childPosition !== childIx) {
        let selection = childSelections[childIx];
        selection.forEach((group, id) => {
          let color = d3.hsl(ts.brushesColorScale(id));
          color.s = 1;
          color.l = lums[childIx]; //initLum + LStep * (childSelections.length - 1 - childIx);
          renderOverviewCanvasSubset(group, ts.selectedAlpha, color);
        });
      }
    }); */

      // Render Highlighted selection
      if (otherSelectionToHightlight) {
        let positionTs = otherSelectionToHightlight.positionTs;
        let groupId = otherSelectionToHightlight.groupId;
        if (
          positionTs !== childPosition &&
          childSelections[positionTs] && // Can be null when start a new Brush
          childSelections[positionTs].has(groupId)
        ) {
          let color = computeColor(groupId, positionTs);
          renderOverviewCanvasSubset(
            childSelections[positionTs].get(groupId),
            ts.highlightAlpha,
            color,
            groupId
          );
        }
      }

      context.save();
      // Render group Medians
      if (medians) {
        context.lineWidth = ts.medianLineWidth;
        context.globalAlpha = ts.medianLineAlpha;

        medians.forEach((d) => {
          if (!d[1]) {
            console.log("Error drawing medians, empty data", d);
            return;
          }
          let path = new Path2D(linem(d[1]));
          context.setLineDash(ts.medianLineDash);
          context.strokeStyle = darken(computeColor(d[0], childPosition));
          context.stroke(path);
        });
      }
      context.restore();
    }
  }

  function computeColor(groupId, childPosition) {
    if (childPosition !== undefined)
      return ts.brushesColorScale[groupId](childPosition);

    if (ts.brushesColorScale instanceof Array)
      return ts.brushesColorScale[groupId](childPosition);

    return ts.brushesColorScale(groupId);
  }

  // Pass a groupId when rendering a highlighted selection for a group
  function renderOverviewCanvasSubset(
    dataSubset,
    alpha,
    color,
    groupId = null
  ) {
    if (!dataSubset) {
      console.log("\uD83D\uDEAB Error renderOverviewCanvasSubset called with no dataSubset", dataSubset);
      return;
    }

    //context.save();
    // Compute the transparency with respect to the number of lines drawn
    // Min 0.05, then adjust by the expected alpha divided by 10% of the number of lines
    // context.globalAlpha = 0.05 + alpha / (dataSubset.length * 0.1);
    context.globalAlpha = alpha * ts.alphaScale(dataSubset.length);

    

    for (let d of dataSubset) {
      let path = paths.get(d[0]);
      if (!path) {
        console.log("renderOverviewCanvasSubset error finding path", d[0], d);
        return;
      }
      let strokeColor = color;
      if (groupAttr) {
        const baseGroupColor = ts.colorScale(path.group);
        strokeColor = ts.selectedColorTransform(baseGroupColor, groupId);

        // const { h, c, l, opacity } = d3.lch(baseGroupColor);
        // strokeColor = d3.lch(l + ts.brushesColorScale(groupId), c, h, opacity);
        // console.log(
        //   "group",
        //   groupId,

        //   "baseGroupColor",
        //   baseGroupColor,
        //   h,
        //   s,
        //   l,
        //   o,

        //   "after",
        //   strokeColor
        // );
      }
      // context.strokeStyle = groupAttr ? ts.colorScale(path.group) : color;
      context.strokeStyle = "" + strokeColor;
      context.stroke(path.path);
    }
  }

  me.render = function (
    dataSelected,
    dataNotSelected,
    medians,
    hasSelection,
    childSelections,
    childPosition,
    otherSelectionToHightlight
  ) {
    renderOvwerview(
      dataSelected,
      dataNotSelected,
      medians,
      hasSelection,
      childSelections,
      childPosition,
      otherSelectionToHightlight
    );
  };

  return me;
}

/* eslint-disable no-undefined,no-param-reassign,no-shadow */

/**
 * Throttle execution of a function. Especially useful for rate limiting
 * execution of handlers on events like resize and scroll.
 *
 * @param {number} delay -                  A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher)
 *                                            are most useful.
 * @param {Function} callback -               A function to be executed after delay milliseconds. The `this` context and all arguments are passed through,
 *                                            as-is, to `callback` when the throttled-function is executed.
 * @param {object} [options] -              An object to configure options.
 * @param {boolean} [options.noTrailing] -   Optional, defaults to false. If noTrailing is true, callback will only execute every `delay` milliseconds
 *                                            while the throttled-function is being called. If noTrailing is false or unspecified, callback will be executed
 *                                            one final time after the last throttled-function call. (After the throttled-function has not been called for
 *                                            `delay` milliseconds, the internal counter is reset).
 * @param {boolean} [options.noLeading] -   Optional, defaults to false. If noLeading is false, the first throttled-function call will execute callback
 *                                            immediately. If noLeading is true, the first the callback execution will be skipped. It should be noted that
 *                                            callback will never executed if both noLeading = true and noTrailing = true.
 * @param {boolean} [options.debounceMode] - If `debounceMode` is true (at begin), schedule `clear` to execute after `delay` ms. If `debounceMode` is
 *                                            false (at end), schedule `callback` to execute after `delay` ms.
 *
 * @returns {Function} A new, throttled, function.
 */
function throttle (delay, callback, options) {
  var _ref = options || {},
      _ref$noTrailing = _ref.noTrailing,
      noTrailing = _ref$noTrailing === void 0 ? false : _ref$noTrailing,
      _ref$noLeading = _ref.noLeading,
      noLeading = _ref$noLeading === void 0 ? false : _ref$noLeading,
      _ref$debounceMode = _ref.debounceMode,
      debounceMode = _ref$debounceMode === void 0 ? undefined : _ref$debounceMode;
  /*
   * After wrapper has stopped being called, this timeout ensures that
   * `callback` is executed at the proper times in `throttle` and `end`
   * debounce modes.
   */


  var timeoutID;
  var cancelled = false; // Keep track of the last time `callback` was executed.

  var lastExec = 0; // Function to clear existing timeout

  function clearExistingTimeout() {
    if (timeoutID) {
      clearTimeout(timeoutID);
    }
  } // Function to cancel next exec


  function cancel(options) {
    var _ref2 = options || {},
        _ref2$upcomingOnly = _ref2.upcomingOnly,
        upcomingOnly = _ref2$upcomingOnly === void 0 ? false : _ref2$upcomingOnly;

    clearExistingTimeout();
    cancelled = !upcomingOnly;
  }
  /*
   * The `wrapper` function encapsulates all of the throttling / debouncing
   * functionality and when executed will limit the rate at which `callback`
   * is executed.
   */


  function wrapper() {
    for (var _len = arguments.length, arguments_ = new Array(_len), _key = 0; _key < _len; _key++) {
      arguments_[_key] = arguments[_key];
    }

    var self = this;
    var elapsed = Date.now() - lastExec;

    if (cancelled) {
      return;
    } // Execute `callback` and update the `lastExec` timestamp.


    function exec() {
      lastExec = Date.now();
      callback.apply(self, arguments_);
    }
    /*
     * If `debounceMode` is true (at begin) this is used to clear the flag
     * to allow future `callback` executions.
     */


    function clear() {
      timeoutID = undefined;
    }

    if (!noLeading && debounceMode && !timeoutID) {
      /*
       * Since `wrapper` is being called for the first time and
       * `debounceMode` is true (at begin), execute `callback`
       * and noLeading != true.
       */
      exec();
    }

    clearExistingTimeout();

    if (debounceMode === undefined && elapsed > delay) {
      if (noLeading) {
        /*
         * In throttle mode with noLeading, if `delay` time has
         * been exceeded, update `lastExec` and schedule `callback`
         * to execute after `delay` ms.
         */
        lastExec = Date.now();

        if (!noTrailing) {
          timeoutID = setTimeout(debounceMode ? clear : exec, delay);
        }
      } else {
        /*
         * In throttle mode without noLeading, if `delay` time has been exceeded, execute
         * `callback`.
         */
        exec();
      }
    } else if (noTrailing !== true) {
      /*
       * In trailing throttle mode, since `delay` time has not been
       * exceeded, schedule `callback` to execute `delay` ms after most
       * recent execution.
       *
       * If `debounceMode` is true (at begin), schedule `clear` to execute
       * after `delay` ms.
       *
       * If `debounceMode` is false (at end), schedule `callback` to
       * execute after `delay` ms.
       */
      timeoutID = setTimeout(debounceMode ? clear : exec, debounceMode === undefined ? delay - elapsed : delay);
    }
  }

  wrapper.cancel = cancel; // Return the wrapper function.

  return wrapper;
}

/*Data is an array of the next form
[
  [id,[[x0,y0],[x1,y1]...]]
  .
  .
  .
]
 */
function BVH({
  data,
  xPartitions = 10,
  yPartitions = 10,
  polylines = true,
}) {
  let me = {};
  let BVH = makeBVH();

  function pupulateBVHPolylines(data, BVH) {
    let xinc = BVH.xinc;
    let yinc = BVH.yinc;
    data.forEach((d) => {
      let key = d[0];
      let lastXindex = -1;
      let lastYindex = -1;
      for (let i = 0; i < d[1].length; ++i) {
        let current = d[1][i];
        let xCoor = current[0];
        let yCoor = current[1];
        if (xCoor != null && yCoor != null) {
          let xIndex = Math.floor(xCoor / xinc);
          let yIndex = Math.floor(yCoor / yinc);
          if (isNaN(xIndex) || isNaN(yIndex)) {
            log("ERROR: xIndex or YIndex is NaN: XCoor: " + xCoor +"; yCoor: " + yCoor );
          }

          if (i === 0) {
            BVH.BVH[xIndex][yIndex].data.set(key, [[current]]);
          } else {
            if (xIndex === lastXindex && yIndex === lastYindex) {
              BVH.BVH[xIndex][yIndex].data.get(key).at(-1).push(current);
            } else {
              let previousCell = BVH.BVH[lastXindex][lastYindex];
              previousCell.data.get(key).at(-1).push(current);
              let previous = d[1][i - 1];
              for (let row of BVH.BVH) {
                for (let cell of row) {
                  if (cell !== previousCell) {
                    if (
                      lineIntersection(
                        [previous, current],
                        cell.x0,
                        cell.y0,
                        cell.x1,
                        cell.y1
                      )
                    ) {
                      if (cell.data.has(key)) {
                        cell.data.get(key).push([previous]);
                        cell.data.get(key).at(-1).push(current);
                      } else {
                        cell.data.set(key, [[previous]]);
                        cell.data.get(key).at(-1).push(current);
                      }
                    }
                  }
                }
              }
            }
          }
          lastXindex = xIndex;
          lastYindex = yIndex;
        }
      }
    });
  }

  function populateBVHPoints(data, BVH) {
    let xinc = BVH.xinc;
    let yinc = BVH.yinc;
    data.forEach(d => {
      let key = d[0];
      for (let point of d[1]) {
        let [x, y] = point;
        let Iindex = Math.floor(x / xinc);
        let Jindex = Math.floor(y / yinc);
        let cell = BVH.BVH[Iindex][Jindex];

        if (cell.data.has(key)) {
          cell.data.get(key).push([x,y]);
        } else {
          cell.data.set(key,[x,y]);
        }
      }
    });
  }

  function makeBVH() {
    let keys = data.map((d) => d[0]);
    let allValues = data.map(d => d[1]).flat();
    let extentX = d3.extent(allValues, d => d[0]);
    let extentY = d3.extent(allValues, d => d[1]);
    let width = (extentX[1] - extentX[0]) + 1;
    let height = (extentY[1] - extentY[0]) + 1;
    let xinc = width / xPartitions;
    let yinc = height / yPartitions;
    let BVH = {
      width: width,
      height: height,
      xinc: xinc,
      yinc: yinc,
      offsetX: extentX[0],
      offsetY: extentY[0],
      keys: keys,
      BVH: [],
    };

    for (let i = 0; i < xPartitions; ++i) {
      BVH.BVH[i] = [];
      let currentX = i * xinc;
      for (let j = 0; j < yPartitions; ++j) {
        let currentY = yinc * j;
        BVH.BVH[i][j] = {
          x0: currentX,
          x1: currentX + xinc,
          y0: currentY,
          y1: currentY + yinc,
          data: new Map(),
        };
      }
    }

    // Move the data to start at coordinates [0,0]
    data = data.map(([k, v]) => [k, v.map(([x, y]) => [x - BVH.offsetX, y - BVH.offsetY])]);


    if (polylines)
      pupulateBVHPolylines(data, BVH);
    else
      populateBVHPoints(data, BVH);

    return BVH;
  }

  function pointIntersection(point, x0, y0, x1, y1) {
    let [px,py] = point;
    return px >= x0 && px <= x1 && py >= y0 && py <= y1;
  }

  //Calculate the intersection with the first vertical line of the box.
  function intersectX0(initPoint, finalPoint, x0, y0, x1, y1) {
    let intersectX0 =
      (initPoint[0] <= x0 && finalPoint[0] >= x0) ||
      (initPoint[0] >= x0 && finalPoint[0] <= x0);
    if (intersectX0) {
      let m = (finalPoint[1] - initPoint[1]) / (finalPoint[0] - initPoint[0]);
      let y = m * (x0 - initPoint[0]) + initPoint[1];
      return y >= y0 && y <= y1;
    }
    return false;
  }

  function intersectX1(initPoint, finalPoint, x0, y0, x1, y1) {
    let intersectX1 =
      (initPoint[0] <= x1 && finalPoint[0]) >= x1 ||
      (initPoint[0] >= x1 && finalPoint[0] <= x1);
    if (intersectX1) {
      let m = (finalPoint[1] - initPoint[1]) / (finalPoint[0] - initPoint[0]);
      let y = m * (x1 - initPoint[0]) + initPoint[1];
      return y >= y0 && y <= y1;
    }
    return false;
  }

  function intersectY0(initPoint, finalPoint, x0, y0, x1, y1) {
    let intersectY0 =
      (initPoint[1] <= y0 && finalPoint[1] >= y0) ||
      (initPoint[1] >= y0 && finalPoint[1] <= y0);
    if (intersectY0) {
      let m = (finalPoint[1] - initPoint[1]) / (finalPoint[0] - initPoint[0]);
      let x = (y0 - initPoint[1]) / m + initPoint[0];
      return x >= x0 && x <= x1;
    }
    return false;
  }

  function intersectY1(initPoint, finalPoint, x0, y0, x1, y1) {
    let intersectY1 =
      (initPoint[1] >= y1 && finalPoint[1] <= y1) ||
      (initPoint[1] <= y1 && finalPoint[1] >= y1);
    if (intersectY1) {
      let m = (finalPoint[1] - initPoint[1]) / (finalPoint[0] - initPoint[0]);
      let x = (y1 - initPoint[1]) / m + initPoint[0];
      return x >= x0 && x <= x1;
    }
    return false;
  }

  function lineIntersection(line, x0, y0, x1, y1) {
    let initPoint = line[0];

    for (let index = 1; index < line.length; ++index) {
      let finalPoint = line[index];
      if (intersectX0(initPoint, finalPoint, x0, y0, x1, y1)) return true;
      if (intersectX1(initPoint, finalPoint, x0, y0, x1, y1)) return true;
      if (intersectY0(initPoint, finalPoint, x0, y0, x1)) return true;
      if (intersectY1(initPoint, finalPoint, x0, y0, x1, y1)) return true;
      initPoint = finalPoint;
    }
    return pointIntersection(initPoint, x0, y0, x1, y1);
  }

  function containIntersection(line, x0, y0, x1, y1) {
    let initPoint = line[0];
    let finalPoint = line[line.length - 1];
    let isIntersectX0 = false;
    let isIntersectX1 = false;

    if (initPoint[0] < x0 && finalPoint[0] < x0) return undefined;
    if (initPoint[0] > x1 && finalPoint[0] > x1) return undefined;

    for (let index = 1; index < line.length; ++index) {
      let finalPoint = line[index];
      if (isIntersectX0 || intersectX0(initPoint, finalPoint, x0, y0, x1, y1)) isIntersectX0 = true;
      if (isIntersectX1 || intersectX1(initPoint, finalPoint, x0, y0, x1, y1)) isIntersectX1 = true;
      if (intersectY0(initPoint, finalPoint, x0, y0, x1)) return false;
      if (intersectY1(initPoint, finalPoint, x0, y0, x1, y1)) return false;
      initPoint = finalPoint;
    }

    let isAllLineInside = !isIntersectX0 && !isIntersectX1;
    if (isAllLineInside) {
      return pointIntersection(line[0], x0, y0, x1, y1);
    }

    return true;
  }

  // Returns the range of cells that collide with the given box. The result is of the form [[InitI,EndI],[INiJ, EndJ]]]
  function getCollidingCells(x0, y0, x1, y1) {
    if (x1 > BVH.width || y1 > BVH.height || x0 < 0 || y0 < 0)
      log("\uD83D\uDC41\uFE0F BVH is called off limits", [
        [x0, y0],
        [x1, y1],
      ]);

    // Esure that the coordinates are in the limits oh the BVH
    x1 = Math.min(x1, BVH.width - 1);
    y1 = Math.min(y1, BVH.height - 1);
    x0 = Math.max(x0, 0);
    y0 = Math.max(y0, 0);

    let initI = Math.floor(x0 / BVH.xinc);
    let finI = Math.floor(x1 / BVH.xinc);
    let initJ = Math.floor(y0 / BVH.yinc);
    let finJ = Math.floor(y1 / BVH.yinc);
    return [[initI, finI], [initJ, finJ]];
  }

  //
  function applyOffsets(x0, y0, x1, y1) {
    return [x0 - BVH.offsetX, y0 - BVH.offsetY, x1 - BVH.offsetX, y1 - BVH.offsetY];
  }

  // Returns all the polylines that satisfy the function "testFunc" for a complete polyline. The function testFunct must be as follows
  // TestFunc( Entity, x0, x1,y0,y1). Where entity is a polyline and return true, false or undefined if the result of the cuerrent entity dosent matter
  function testsEntitiesAll(x0, y0, x1, y1, testFunc) {
    [x0, y0, x1, y1] = applyOffsets(x0, y0, x1, y1);
    let [[initI, finI], [initJ, finJ]] = getCollidingCells(x0, y0, x1, y1);

    let contains = new Set();
    let notContains = new Set();


    for (let i = initI; i <= finI; ++i)
      for (let j = initJ; j <= finJ; ++j)
        for (const entities of BVH.BVH[i][j].data)
          if (!notContains.has(entities[0])){
            for (const entity of entities[1]) {
              let intersect = testFunc(entity, x0, y0, x1, y1);
              if (intersect !== undefined) {
                if (intersect) {
                  contains.add(entities[0]);
                } else {
                  notContains.add(entities[0]);
                }
              }
            }
          }

    notContains.forEach(d => contains.delete(d));

    return contains;

  }

  // Returns all the polylines that satisfy the function "testFunc" for any piece of polyline. The function testFunct must be as follows
  // TestFunc( Entity, x0, x1,y0,y1). Where entity is a polyline.
  function testsEntitiesAny(x0, y0, x1, y1, testFunc) {
    [x0, y0, x1, y1] = applyOffsets(x0, y0, x1, y1);
    let [[initI, finI], [initJ, finJ]] = getCollidingCells(x0, y0, x1, y1);

    let intersections = new Set();

    for (let i = initI; i <= finI; ++i)
      for (let j = initJ; j <= finJ; ++j)
        for (const entities of BVH.BVH[i][j].data)
          if (!intersections.has(entities[0]))
            for (const entity of entities[1]) {
              let intersect = testFunc(entity, x0, y0, x1, y1);
              if (intersect) {
                intersections.add(entities[0]);
                break;
              }
            }

    return intersections;
  }

  me.contains = function(x0, y0, x1, y1) {
    return testsEntitiesAll(x0, y0, x1, y1, containIntersection);
  };


  me.intersect = function(x0, y0, x1, y1) {
    return testsEntitiesAny(x0, y0, x1, y1, lineIntersection);

  };

  return me;
}

function renderHtml(string) {
  const template = document.createElement("template");
  template.innerHTML = string;
  return document.importNode(template.content, true);
}

function renderSvg(string) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.innerHTML = string;
  return g;
}

const html = Object.assign(hypertext(renderHtml, fragment => {
  if (fragment.firstChild === null) return null;
  if (fragment.firstChild === fragment.lastChild) return fragment.removeChild(fragment.firstChild);
  const span = document.createElement("span");
  span.appendChild(fragment);
  return span;
}), {fragment: hypertext(renderHtml, fragment => fragment)});

Object.assign(hypertext(renderSvg, g => {
  if (g.firstChild === null) return null;
  if (g.firstChild === g.lastChild) return g.removeChild(g.firstChild);
  return g;
}), {fragment: hypertext(renderSvg, g => {
  const fragment = document.createDocumentFragment();
  while (g.firstChild) fragment.appendChild(g.firstChild);
  return fragment;
})});

const
CODE_TAB = 9,
CODE_LF = 10,
CODE_FF = 12,
CODE_CR = 13,
CODE_SPACE = 32,
CODE_UPPER_A = 65,
CODE_UPPER_Z = 90,
CODE_LOWER_A = 97,
CODE_LOWER_Z = 122,
CODE_LT = 60,
CODE_GT = 62,
CODE_SLASH = 47,
CODE_DASH = 45,
CODE_BANG = 33,
CODE_EQ = 61,
CODE_DQUOTE = 34,
CODE_SQUOTE = 39,
CODE_QUESTION = 63,
STATE_DATA = 1,
STATE_TAG_OPEN = 2,
STATE_END_TAG_OPEN = 3,
STATE_TAG_NAME = 4,
STATE_BOGUS_COMMENT = 5,
STATE_BEFORE_ATTRIBUTE_NAME = 6,
STATE_AFTER_ATTRIBUTE_NAME = 7,
STATE_ATTRIBUTE_NAME = 8,
STATE_BEFORE_ATTRIBUTE_VALUE = 9,
STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED = 10,
STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED = 11,
STATE_ATTRIBUTE_VALUE_UNQUOTED = 12,
STATE_AFTER_ATTRIBUTE_VALUE_QUOTED = 13,
STATE_SELF_CLOSING_START_TAG = 14,
STATE_COMMENT_START = 15,
STATE_COMMENT_START_DASH = 16,
STATE_COMMENT = 17,
STATE_COMMENT_LESS_THAN_SIGN = 18,
STATE_COMMENT_LESS_THAN_SIGN_BANG = 19,
STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH = 20,
STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH = 21,
STATE_COMMENT_END_DASH = 22,
STATE_COMMENT_END = 23,
STATE_COMMENT_END_BANG = 24,
STATE_MARKUP_DECLARATION_OPEN = 25,
STATE_RAWTEXT = 26,
STATE_RAWTEXT_LESS_THAN_SIGN = 27,
STATE_RAWTEXT_END_TAG_OPEN = 28,
STATE_RAWTEXT_END_TAG_NAME = 29,
SHOW_COMMENT = 128,
SHOW_ELEMENT = 1,
TYPE_COMMENT = 8,
TYPE_ELEMENT = 1,
NS_SVG = "http://www.w3.org/2000/svg",
NS_XLINK = "http://www.w3.org/1999/xlink",
NS_XML = "http://www.w3.org/XML/1998/namespace",
NS_XMLNS = "http://www.w3.org/2000/xmlns/";

const svgAdjustAttributes = new Map([
  "attributeName",
  "attributeType",
  "baseFrequency",
  "baseProfile",
  "calcMode",
  "clipPathUnits",
  "diffuseConstant",
  "edgeMode",
  "filterUnits",
  "glyphRef",
  "gradientTransform",
  "gradientUnits",
  "kernelMatrix",
  "kernelUnitLength",
  "keyPoints",
  "keySplines",
  "keyTimes",
  "lengthAdjust",
  "limitingConeAngle",
  "markerHeight",
  "markerUnits",
  "markerWidth",
  "maskContentUnits",
  "maskUnits",
  "numOctaves",
  "pathLength",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "pointsAtX",
  "pointsAtY",
  "pointsAtZ",
  "preserveAlpha",
  "preserveAspectRatio",
  "primitiveUnits",
  "refX",
  "refY",
  "repeatCount",
  "repeatDur",
  "requiredExtensions",
  "requiredFeatures",
  "specularConstant",
  "specularExponent",
  "spreadMethod",
  "startOffset",
  "stdDeviation",
  "stitchTiles",
  "surfaceScale",
  "systemLanguage",
  "tableValues",
  "targetX",
  "targetY",
  "textLength",
  "viewBox",
  "viewTarget",
  "xChannelSelector",
  "yChannelSelector",
  "zoomAndPan"
].map(name => [name.toLowerCase(), name]));

const svgForeignAttributes = new Map([
  ["xlink:actuate", NS_XLINK],
  ["xlink:arcrole", NS_XLINK],
  ["xlink:href", NS_XLINK],
  ["xlink:role", NS_XLINK],
  ["xlink:show", NS_XLINK],
  ["xlink:title", NS_XLINK],
  ["xlink:type", NS_XLINK],
  ["xml:lang", NS_XML],
  ["xml:space", NS_XML],
  ["xmlns", NS_XMLNS],
  ["xmlns:xlink", NS_XMLNS]
]);

function hypertext(render, postprocess) {
  return function({raw: strings}) {
    let state = STATE_DATA;
    let string = "";
    let tagNameStart; // either an open tag or an end tag
    let tagName; // only open; beware nesting! used only for rawtext
    let attributeNameStart;
    let attributeNameEnd;
    let nodeFilter = 0;

    for (let j = 0, m = arguments.length; j < m; ++j) {
      const input = strings[j];

      if (j > 0) {
        const value = arguments[j];
        switch (state) {
          case STATE_RAWTEXT: {
            if (value != null) {
              const text = `${value}`;
              if (isEscapableRawText(tagName)) {
                string += text.replace(/[<]/g, entity);
              } else if (new RegExp(`</${tagName}[\\s>/]`, "i").test(string.slice(-tagName.length - 2) + text)) {
                throw new Error("unsafe raw text"); // appropriate end tag
              } else {
                string += text;
              }
            }
            break;
          }
          case STATE_DATA: {
            if (value == null) ; else if (value instanceof Node
                || (typeof value !== "string" && value[Symbol.iterator])
                || (/(?:^|>)$/.test(strings[j - 1]) && /^(?:<|$)/.test(input))) {
              string += "<!--::" + j + "-->";
              nodeFilter |= SHOW_COMMENT;
            } else {
              string += `${value}`.replace(/[<&]/g, entity);
            }
            break;
          }
          case STATE_BEFORE_ATTRIBUTE_VALUE: {
            state = STATE_ATTRIBUTE_VALUE_UNQUOTED;
            let text;
            if (/^[\s>]/.test(input)) {
              if (value == null || value === false) {
                string = string.slice(0, attributeNameStart - strings[j - 1].length);
                break;
              }
              if (value === true || (text = `${value}`) === "") {
                string += "''";
                break;
              }
              const name = strings[j - 1].slice(attributeNameStart, attributeNameEnd);
              if ((name === "style" && isObjectLiteral(value)) || typeof value === "function") {
                string += "::" + j;
                nodeFilter |= SHOW_ELEMENT;
                break;
              }
            }
            if (text === undefined) text = `${value}`;
            if (text === "") throw new Error("unsafe unquoted empty string");
            string += text.replace(/^['"]|[\s>&]/g, entity);
            break;
          }
          case STATE_ATTRIBUTE_VALUE_UNQUOTED: {
            string += `${value}`.replace(/[\s>&]/g, entity);
            break;
          }
          case STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED: {
            string += `${value}`.replace(/['&]/g, entity);
            break;
          }
          case STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
            string += `${value}`.replace(/["&]/g, entity);
            break;
          }
          case STATE_BEFORE_ATTRIBUTE_NAME: {
            if (isObjectLiteral(value)) {
              string += "::" + j + "=''";
              nodeFilter |= SHOW_ELEMENT;
              break;
            }
            throw new Error("invalid binding");
          }
          case STATE_COMMENT: break;
          default: throw new Error("invalid binding");
        }
      }

      for (let i = 0, n = input.length; i < n; ++i) {
        const code = input.charCodeAt(i);

        switch (state) {
          case STATE_DATA: {
            if (code === CODE_LT) {
              state = STATE_TAG_OPEN;
            }
            break;
          }
          case STATE_TAG_OPEN: {
            if (code === CODE_BANG) {
              state = STATE_MARKUP_DECLARATION_OPEN;
            } else if (code === CODE_SLASH) {
              state = STATE_END_TAG_OPEN;
            } else if (isAsciiAlphaCode(code)) {
              tagNameStart = i, tagName = undefined;
              state = STATE_TAG_NAME, --i;
            } else if (code === CODE_QUESTION) {
              state = STATE_BOGUS_COMMENT, --i;
            } else {
              state = STATE_DATA, --i;
            }
            break;
          }
          case STATE_END_TAG_OPEN: {
            if (isAsciiAlphaCode(code)) {
              state = STATE_TAG_NAME, --i;
            } else if (code === CODE_GT) {
              state = STATE_DATA;
            } else {
              state = STATE_BOGUS_COMMENT, --i;
            }
            break;
          }
          case STATE_TAG_NAME: {
            if (isSpaceCode(code)) {
              state = STATE_BEFORE_ATTRIBUTE_NAME;
              tagName = lower(input, tagNameStart, i);
            } else if (code === CODE_SLASH) {
              state = STATE_SELF_CLOSING_START_TAG;
            } else if (code === CODE_GT) {
              tagName = lower(input, tagNameStart, i);
              state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
            }
            break;
          }
          case STATE_BEFORE_ATTRIBUTE_NAME: {
            if (isSpaceCode(code)) ; else if (code === CODE_SLASH || code === CODE_GT) {
              state = STATE_AFTER_ATTRIBUTE_NAME, --i;
            } else if (code === CODE_EQ) {
              state = STATE_ATTRIBUTE_NAME;
              attributeNameStart = i + 1, attributeNameEnd = undefined;
            } else {
              state = STATE_ATTRIBUTE_NAME, --i;
              attributeNameStart = i + 1, attributeNameEnd = undefined;
            }
            break;
          }
          case STATE_ATTRIBUTE_NAME: {
            if (isSpaceCode(code) || code === CODE_SLASH || code === CODE_GT) {
              state = STATE_AFTER_ATTRIBUTE_NAME, --i;
              attributeNameEnd = i;
            } else if (code === CODE_EQ) {
              state = STATE_BEFORE_ATTRIBUTE_VALUE;
              attributeNameEnd = i;
            }
            break;
          }
          case STATE_AFTER_ATTRIBUTE_NAME: {
            if (isSpaceCode(code)) ; else if (code === CODE_SLASH) {
              state = STATE_SELF_CLOSING_START_TAG;
            } else if (code === CODE_EQ) {
              state = STATE_BEFORE_ATTRIBUTE_VALUE;
            } else if (code === CODE_GT) {
              state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
            } else {
              state = STATE_ATTRIBUTE_NAME, --i;
              attributeNameStart = i + 1, attributeNameEnd = undefined;
            }
            break;
          }
          case STATE_BEFORE_ATTRIBUTE_VALUE: {
            if (isSpaceCode(code)) ; else if (code === CODE_DQUOTE) {
              state = STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
            } else if (code === CODE_SQUOTE) {
              state = STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED;
            } else if (code === CODE_GT) {
              state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
            } else {
              state = STATE_ATTRIBUTE_VALUE_UNQUOTED, --i;
            }
            break;
          }
          case STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
            if (code === CODE_DQUOTE) {
              state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
            }
            break;
          }
          case STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED: {
            if (code === CODE_SQUOTE) {
              state = STATE_AFTER_ATTRIBUTE_VALUE_QUOTED;
            }
            break;
          }
          case STATE_ATTRIBUTE_VALUE_UNQUOTED: {
            if (isSpaceCode(code)) {
              state = STATE_BEFORE_ATTRIBUTE_NAME;
            } else if (code === CODE_GT) {
              state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
            }
            break;
          }
          case STATE_AFTER_ATTRIBUTE_VALUE_QUOTED: {
            if (isSpaceCode(code)) {
              state = STATE_BEFORE_ATTRIBUTE_NAME;
            } else if (code === CODE_SLASH) {
              state = STATE_SELF_CLOSING_START_TAG;
            } else if (code === CODE_GT) {
              state = isRawText(tagName) ? STATE_RAWTEXT : STATE_DATA;
            } else {
              state = STATE_BEFORE_ATTRIBUTE_NAME, --i;
            }
            break;
          }
          case STATE_SELF_CLOSING_START_TAG: {
            if (code === CODE_GT) {
              state = STATE_DATA;
            } else {
              state = STATE_BEFORE_ATTRIBUTE_NAME, --i;
            }
            break;
          }
          case STATE_BOGUS_COMMENT: {
            if (code === CODE_GT) {
              state = STATE_DATA;
            }
            break;
          }
          case STATE_COMMENT_START: {
            if (code === CODE_DASH) {
              state = STATE_COMMENT_START_DASH;
            } else if (code === CODE_GT) {
              state = STATE_DATA;
            } else {
              state = STATE_COMMENT, --i;
            }
            break;
          }
          case STATE_COMMENT_START_DASH: {
            if (code === CODE_DASH) {
              state = STATE_COMMENT_END;
            } else if (code === CODE_GT) {
              state = STATE_DATA;
            } else {
              state = STATE_COMMENT, --i;
            }
            break;
          }
          case STATE_COMMENT: {
            if (code === CODE_LT) {
              state = STATE_COMMENT_LESS_THAN_SIGN;
            } else if (code === CODE_DASH) {
              state = STATE_COMMENT_END_DASH;
            }
            break;
          }
          case STATE_COMMENT_LESS_THAN_SIGN: {
            if (code === CODE_BANG) {
              state = STATE_COMMENT_LESS_THAN_SIGN_BANG;
            } else if (code !== CODE_LT) {
              state = STATE_COMMENT, --i;
            }
            break;
          }
          case STATE_COMMENT_LESS_THAN_SIGN_BANG: {
            if (code === CODE_DASH) {
              state = STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH;
            } else {
              state = STATE_COMMENT, --i;
            }
            break;
          }
          case STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH: {
            if (code === CODE_DASH) {
              state = STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH;
            } else {
              state = STATE_COMMENT_END, --i;
            }
            break;
          }
          case STATE_COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH: {
            state = STATE_COMMENT_END, --i;
            break;
          }
          case STATE_COMMENT_END_DASH: {
            if (code === CODE_DASH) {
              state = STATE_COMMENT_END;
            } else {
              state = STATE_COMMENT, --i;
            }
            break;
          }
          case STATE_COMMENT_END: {
            if (code === CODE_GT) {
              state = STATE_DATA;
            } else if (code === CODE_BANG) {
              state = STATE_COMMENT_END_BANG;
            } else if (code !== CODE_DASH) {
              state = STATE_COMMENT, --i;
            }
            break;
          }
          case STATE_COMMENT_END_BANG: {
            if (code === CODE_DASH) {
              state = STATE_COMMENT_END_DASH;
            } else if (code === CODE_GT) {
              state = STATE_DATA;
            } else {
              state = STATE_COMMENT, --i;
            }
            break;
          }
          case STATE_MARKUP_DECLARATION_OPEN: {
            if (code === CODE_DASH && input.charCodeAt(i + 1) === CODE_DASH) {
              state = STATE_COMMENT_START, ++i;
            } else { // Note: CDATA and DOCTYPE unsupported!
              state = STATE_BOGUS_COMMENT, --i;
            }
            break;
          }
          case STATE_RAWTEXT: {
            if (code === CODE_LT) {
              state = STATE_RAWTEXT_LESS_THAN_SIGN;
            }
            break;
          }
          case STATE_RAWTEXT_LESS_THAN_SIGN: {
            if (code === CODE_SLASH) {
              state = STATE_RAWTEXT_END_TAG_OPEN;
            } else {
              state = STATE_RAWTEXT, --i;
            }
            break;
          }
          case STATE_RAWTEXT_END_TAG_OPEN: {
            if (isAsciiAlphaCode(code)) {
              tagNameStart = i;
              state = STATE_RAWTEXT_END_TAG_NAME, --i;
            } else {
              state = STATE_RAWTEXT, --i;
            }
            break;
          }
          case STATE_RAWTEXT_END_TAG_NAME: {
            if (isSpaceCode(code) && tagName === lower(input, tagNameStart, i)) {
              state = STATE_BEFORE_ATTRIBUTE_NAME;
            } else if (code === CODE_SLASH && tagName === lower(input, tagNameStart, i)) {
              state = STATE_SELF_CLOSING_START_TAG;
            } else if (code === CODE_GT && tagName === lower(input, tagNameStart, i)) {
              state = STATE_DATA;
            } else if (!isAsciiAlphaCode(code)) {
              state = STATE_RAWTEXT, --i;
            }
            break;
          }
          default: {
            state = undefined;
            break;
          }
        }
      }

      string += input;
    }

    const root = render(string);

    const walker = document.createTreeWalker(root, nodeFilter, null, false);
    const removeNodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      switch (node.nodeType) {
        case TYPE_ELEMENT: {
          const attributes = node.attributes;
          for (let i = 0, n = attributes.length; i < n; ++i) {
            const {name, value: currentValue} = attributes[i];
            if (/^::/.test(name)) {
              const value = arguments[+name.slice(2)];
              removeAttribute(node, name), --i, --n;
              for (const key in value) {
                const subvalue = value[key];
                if (subvalue == null || subvalue === false) ; else if (typeof subvalue === "function") {
                  node[key] = subvalue;
                } else if (key === "style" && isObjectLiteral(subvalue)) {
                  setStyles(node[key], subvalue);
                } else {
                  setAttribute(node, key, subvalue === true ? "" : subvalue);
                }
              }
            } else if (/^::/.test(currentValue)) {
              const value = arguments[+currentValue.slice(2)];
              removeAttribute(node, name), --i, --n;
              if (typeof value === "function") {
                node[name] = value;
              } else { // style
                setStyles(node[name], value);
              }
            }
          }
          break;
        }
        case TYPE_COMMENT: {
          if (/^::/.test(node.data)) {
            const parent = node.parentNode;
            const value = arguments[+node.data.slice(2)];
            if (value instanceof Node) {
              parent.insertBefore(value, node);
            } else if (typeof value !== "string" && value[Symbol.iterator]) {
              if (value instanceof NodeList || value instanceof HTMLCollection) {
                for (let i = value.length - 1, r = node; i >= 0; --i) {
                  r = parent.insertBefore(value[i], r);
                }
              } else {
                for (const subvalue of value) {
                  if (subvalue == null) continue;
                  parent.insertBefore(subvalue instanceof Node ? subvalue : document.createTextNode(subvalue), node);
                }
              }
            } else {
              parent.insertBefore(document.createTextNode(value), node);
            }
            removeNodes.push(node);
          }
          break;
        }
      }
    }

    for (const node of removeNodes) {
      node.parentNode.removeChild(node);
    }

    return postprocess(root);
  };
}

function entity(character) {
  return `&#${character.charCodeAt(0).toString()};`;
}

function isAsciiAlphaCode(code) {
  return (CODE_UPPER_A <= code && code <= CODE_UPPER_Z)
      || (CODE_LOWER_A <= code && code <= CODE_LOWER_Z);
}

function isSpaceCode(code) {
  return code === CODE_TAB
      || code === CODE_LF
      || code === CODE_FF
      || code === CODE_SPACE
      || code === CODE_CR; // normalize newlines
}

function isObjectLiteral(value) {
  return value && value.toString === Object.prototype.toString;
}

function isRawText(tagName) {
  return tagName === "script" || tagName === "style" || isEscapableRawText(tagName);
}

function isEscapableRawText(tagName) {
  return tagName === "textarea" || tagName === "title";
}

function lower(input, start, end) {
  return input.slice(start, end).toLowerCase();
}

function setAttribute(node, name, value) {
  if (node.namespaceURI === NS_SVG) {
    name = name.toLowerCase();
    name = svgAdjustAttributes.get(name) || name;
    if (svgForeignAttributes.has(name)) {
      node.setAttributeNS(svgForeignAttributes.get(name), name, value);
      return;
    }
  }
  node.setAttribute(name, value);
}

function removeAttribute(node, name) {
  if (node.namespaceURI === NS_SVG) {
    name = name.toLowerCase();
    name = svgAdjustAttributes.get(name) || name;
    if (svgForeignAttributes.has(name)) {
      node.removeAttributeNS(svgForeignAttributes.get(name), name);
      return;
    }
  }
  node.removeAttribute(name);
}

// We can’t use Object.assign because custom properties…
function setStyles(style, values) {
  for (const name in values) {
    const value = values[name];
    if (name.startsWith("--")) style.setProperty(name, value);
    else style[name] = value;
  }
}

function BrushTooltipEditable({
  fmtX,
  fmtY,
  target,
  margin = { top: 0, left: 0 },
  callback = () => {},
}) {
  const x0E = html`<input class="x0" contenteditable="true"></input>`;
  const y0E = html`<input class="y0" contenteditable="true"></input>`;
  const x1E = html`<input class="x1" contenteditable="true"></input>`;
  const y1E = html`<input class="y1" contenteditable="true"></input>`;

  // https://stackoverflow.com/questions/3392493/adjust-width-of-input-field-to-its-input
  const adjustInputWidth = (input) => {
    input.addEventListener("input", resizeInput); // bind the "resizeInput" callback on "input" event
    resizeInput.call(input); // immediately call the function

    function resizeInput() {
      this.style.width = this.value.length + 1 + "ch";
    }
  };

  const resizeInputs = () => [x0E, y0E, x1E, y1E].map(adjustInputWidth);

  const btnChange0E = html`<button>✅</button>`;
  const btnChange1E = html`<button>✅</button>`;

  const fromE = html`<div style="position: absolute; top:0; left:0;">
    <div style="display:flex; position: absolute; bottom: 0px; right: 0px;">
      ${x0E}<strong> x </strong>${y0E} ${btnChange0E}
    </div>
  </div>`;
  const toE = html`<div style="position: absolute; display:flex;">${x1E}<strong> x </strong>${y1E} ${btnChange1E}</div>`;

  const brushTooltip = html`<div class="__ts_tooltip" style="display: none; z-index:2; position: absolute; top: ${margin.top}px; left: ${margin.left}px;">
    <style>
    div.__ts_tooltip { 
      font-family: sans-serif; font-size: 10pt; 
    }
    div.__ts_tooltip > div > div * { 
      margin-right: 1px;
    }
    div.__ts_tooltip div > button {
      padding: 0px;
      display: none;
    }
    div.__ts_tooltip div:hover > button {
      padding: 0px;
      display: block;
    }
    div.__ts_tooltip input {
      background-color:rgba(255, 255, 255, 0);    
      border: none;
      outline: none;
    }
    div.__ts_tooltip input:focus {
        border: solid #aaa;
    }


    </style>
    <div>${fromE}</div>
    <div>${toE}</div>

  </div>`;

  // x0E.oninput = (evt) => evt.preventDefault();
  // x1E.oninput = (evt) => evt.preventDefault();
  // y0E.oninput = (evt) => evt.preventDefault();
  // y1E.oninput = (evt) => evt.preventDefault();

  brushTooltip.__update = ({ selection, selectionPixels }) => {
    brushTooltip.style.display = "block";
    x0E.value = fmtX(selection[0][0]);
    x1E.value = fmtX(selection[1][0]);
    y0E.value = fmtY(selection[0][1]);
    y1E.value = fmtY(selection[1][1]);

    resizeInputs();

    fromE.style.top = selectionPixels[0][1] + "px";
    fromE.style.left = selectionPixels[0][0] + "px";
    toE.style.top = selectionPixels[1][1] + "px";
    toE.style.left = selectionPixels[1][0] + "px";
  };

  brushTooltip.__hide = () => (brushTooltip.style.display = "none");

  // brushTooltip.oninput = (evt) => evt.preventDefault();

  function triggerUpdate() {
    brushTooltip.value = [
      [x0E.value, y0E.value],
      [x1E.value, y1E.value],
    ];
    brushTooltip.dispatchEvent(new Event("input", { bubbles: true }));

    callback(brushTooltip.value);
  }

  btnChange0E.addEventListener("click", triggerUpdate);
  btnChange1E.addEventListener("click", triggerUpdate);

  let tooltipNode = target.getElementsByClassName("__ts_tooltip");
  if (tooltipNode.length > 0) target.removeChild(tooltipNode[0]);
  target.appendChild(brushTooltip);

  //triggerUpdate();
  resizeInputs();

  return brushTooltip;
}

function BrushContextMenu({ target, callback }) {
  const intersectE = html`<input type="radio" name="mode" id="__ts_c_intersect" value="intersect">`;
  const containsE = html`<input type="radio" name="mode" id="__ts_c_contains" value="contains">`;
  const notE = html`<input type="checkbox"  id="__ts_c_not">`;
  const andE = html`<input type="radio" name="aggregation" id="__ts_c_and" value="and">`;
  const orE = html`<input type="radio" name="aggregation" id="__ts_c_or" value="or">`;
  const closeBtn = html`<button style="position: absolute; right: 0; top: 0; padding: 0; margin: 0; border: none; background: none; cursor: pointer; font-size: 0.8rem; color: #444; line-height: 1; padding: 2px 2px;">&times;</button>`;

  intersectE.onchange = onChange;
  containsE.onchange = onChange;
  andE.onchange = onChange;
  orE.onchange = onChange;
  notE.onchange = onChange;

  let _brush;

  let contextMenu = html`<div class="__ts_contextMenu" style="display: none; z-index: 2; position: absolute" >
        ${closeBtn}
      
        <div class="__ts_option_label"><strong>Mode</strong></div>
        <div class="__ts_option_values">
          <div>
            ${intersectE}
            <label for="__ts_c_intersect" title="Search for timelines that touch any part of the timebox">Intersect</label>
          </div>
          <div>
            ${containsE}
            <label for="__ts_c_contains" title="Search for timelines that are fully contained in the timebox">Contains</label>
          </div>
          <div>
            ${notE}
            <label for="__ts_c_not" title=" ">Not</label>
          </div>
        </div>
      

      
        <div class="__ts_option_label"><strong>Aggregation</strong></div>
        <div class="__ts_option_values">
          <div>
            ${andE}
            <label for="__ts_c_and">And</label>
          </div>
          <div>
            ${orE}
            <label for="__ts_c_or">Or</label>
          </div>
        </div>
      
      

      <style> 
        .__ts_contextMenu { 
            border-radius: 3px;
            padding: 4px 14px 4px 4px;
            position: absolute; 
            width: max-content;
            background: #f6f6f6;
            opacity: 0.9;
            border: 1px solid #ccc; 
            font-family: sans-serif;
            font-size: 0.8rem;
            grid-template-columns: 1fr auto;
            grid-row-gap: 7px;
            box-shadow: 2px 2px 1px 0px #888888;
        }         

        .__ts_contextMenu  .__ts_option_values:hover { 
            background: #eee; 
        } 

        .__ts_contextMenu input[type="radio"] {
          margin-top: -1px;
          vertical-align: middle;
        }
      </style> 
    </div>`;

  target.appendChild(contextMenu);

  // To keep track of the hiding timeout
  let toHide = null;
  // If the mouse leaves the context menu, hide it after 1s
  contextMenu.onmouseleave = () =>
    (toHide = setTimeout(() => {
      contextMenu.__hide();
      toHide = null;
    }, 1000));
  // But if the mouse re-enters the context menu, cancel the hiding
  contextMenu.onmouseenter = () => {
    toHide && clearTimeout(toHide);
    toHide = null;
  };
  closeBtn.onclick = () => contextMenu.__hide();

  function onChange() {
    let brushMode = intersectE.checked
      ? BrushModes.Intersect
      : BrushModes.Contains;
    let brushAggregation = andE.checked
      ? BrushAggregation.And
      : BrushAggregation.Or;
    let brushNot = notE.checked;
    callback(brushMode, brushAggregation, brushNot, _brush);
  }

  contextMenu.__hide = () => (contextMenu.style.display = "none");
  contextMenu.__show = (mode, aggregation,not, pxX, pxY, brush) => {
    _brush = brush;
    switch (mode) {
      case BrushModes.Intersect:
        intersectE.checked = true;
        break;
      case BrushModes.Contains:
        containsE.checked = true;
        break;
      default:
        intersectE.checked = true;
        log(
          "\uD83D\uDEAB ERROR The method elected to compute the selection are not support"
        );
    }

    notE.checked = not;

    switch (aggregation) {
      case BrushAggregation.And:
        andE.checked = true;
        break;
      case BrushAggregation.Or:
        orE.checked = true;
        break;
      default:
        andE.checked = true;
        log("\uD83D\uDEAB ERROR The aggregation method elected are not support");
    }

    contextMenu.style.display = "grid";
    contextMenu.style.left = pxX + "px";
    contextMenu.style.top = pxY + "px";
  };

  return contextMenu;
}

function brushInteraction({
  ts,
  data,
  element,
  tooltipTarget,
  contextMenuTarget,
  xPartitions,
  yPartitions,
  x,
  y,
  scaleX,
  scaleY,
  fmtX,
  fmtY,
  updateTime,
  brushShadow,
  minBrushSize = 5, // Min size in pixels of brushes
  tsLevel, // Store the level of the TS for brushColor. See how to change this TODO
  selectionCallback = () => {}, // (dataSelected, dataNotSelected, hasSelection) => {} Called when selected elements change
  groupsCallback = () => {}, // (groups) => {} Called when information of the groups changes (not the selection made by them)
  changeSelectedCoordinatesCallback = () => {}, // (selection) => {} Called when the coordinates of the selected brush change.
  selectedBrushCallback = () => {}, // (brush) => {} Called when the selected Brush changes.
  statusCallback = () => {}, // (status) => {}
}) {
  let me = {},
    brushSize,
    brushesGroup,
    brushCount = 0,
    gBrushes,
    tBrushed,
    tUpdateSelection,
    tShowTooltip,
    tSelectionCall,
    brushGroupSelected,
    selectedBrush,
    dataSelected,
    dataNotSelected,
    BVH_,
    brushTooltip,
    brushContextMenu,
    brushWithTooltip;

  if (!data) return;

  gBrushes = d3.select(element);
  gBrushes.node().innerHTML = "";

  tBrushed = throttle(updateTime, brushed);
  tUpdateSelection = throttle(updateTime, updateSelection);
  tShowTooltip = throttle(50, showBrushTooltip);
  tSelectionCall = throttle(50, updateSelectedCoordinates);

  dataSelected = new Map();
  dataNotSelected = [];
  brushesGroup = new Map();
  brushCount = 0;
  brushSize = 0;
  let BVHData = data.map((d) => {
    let polyline = d[1].map((d) => [scaleX(x(d)), scaleY(y(d))]);
    return [d[0], polyline];
  });

  BVH_ = BVH({
    data: BVHData,
    xPartitions,
    yPartitions,
  });

  brushTooltip = BrushTooltipEditable({
    fmtX,
    fmtY,
    target: tooltipTarget,
    margin: { top: ts.margin.top, left: ts.margin.left },
    callback: onTooltipChange,
  });

  brushContextMenu = BrushContextMenu({
    target: contextMenuTarget,
    callback: onContextMenuChange,
  });

  function onTooltipChange([[x0, y0], [x1, y1]]) {
    y0 = +y0;
    y1 = +y1;
    if (isNaN(+x0)) {
      let timeParse = d3.timeParse(fmtX);
      x0 = timeParse(x0);
      x1 = timeParse(x1);
    } else {
      x0 = +x0;
      x1 = +x1;
    }
    me.moveBrush(brushWithTooltip, [
      [x0, y0],
      [x1, y1],
    ]);
  }

  function onContextMenuChange(mode, aggregation, not, brush) {
    brush[1].mode = mode;
    brush[1].aggregation = aggregation;
    brush[1].negate = not;
    updateBrush(brush);
    brushFilter();
  }

  const onBrushStart = (e, brushObject) => {
    log("\uD83D\uDCA1  onBrushStart", brushObject, arguments.length);
    if (!brushObject || !brushObject.length) {
      // TODO
      log("\uD83D\uDEAB ERRROR onBrushStart called with no or wrong brush", brushObject);
      return;
    }

    // if (!brushObject[1].selection) {
    //   log("👁️ brushStart, selection is null, not doing anything ");
    //   return;
    // }
    const [id, brush] = brushObject;

    // call when the user starts interacting with a timeBox
    // If the user is creating a new TimeBox, modify the group to which the timeBox belongs.
    if (id === brushCount - 1) {
      brushSize++;
      changeBrushOfGroup([id, brush], brushGroupSelected);
      brushesGroup.get(brushGroupSelected).isEnable = true;
      selectedBrush = [id, brush];
      selectedBrushCallback(selectedBrush);
      drawBrushes();
    }
    if (ts.autoUpdate) {
      tBrushed(e, [id, brush]);
    }
  };

  function onBrushEnd({ selection, sourceEvent }, brush) {
    if (sourceEvent === undefined) return;
    if (selection) {
      let [[x0, y0], [x1, y1]] = selection;
      if (
        Math.abs(x0 - x1) < minBrushSize &&
        Math.abs(y0 - y1) < minBrushSize
      ) {
        // Remove brush smaller than 5px
        removeBrush(brush);
      } else if (!ts.autoUpdate) {
        // update manually if not autoupdate with brushed event.
        if (brush[1].isSelected) {
          updateSelection();
        } else {
          brushed({ selection, sourceEvent }, brush);
        }
      }
    } else {
      removeBrush(brush);
    }
    if (brush[0] === brushCount - 1) newBrush(); // If the user has just created a new TimeBox, prepare the next one so that it can be created.

    drawBrushes();
  }

  // Call newBrush with an initial Selection to create the brush on initial selection
  function newBrush(
    mode = BrushModes.Intersect,
    aggregation = BrushAggregation.And,
    brushGroup = brushGroupSelected,
    brushinitialSelection = undefined
  ) {
    // Create the brush
    let brush = d3.brush().on("start", onBrushStart);

    // Add the new brush to the group
    brushesGroup
      .get(brushGroup)
      .brushes.set(
        brushCount,
        generateBrush(
          brush,
          mode,
          aggregation,
          brushGroup,
          null,
          null,
          brushinitialSelection
        )
      );
    let brushObject = [
      brushCount,
      brushesGroup.get(brushGroupSelected).brushes.get(brushCount),
    ];
    // Set events for Brush
    brush.on("brush.move", moveSelectedBrushes);
    brush.on("brush.Selected", tSelectionCall);
    if (ts.autoUpdate) {
      // Update brushSelection only if autoUpdate
      brush.on("brush.brushed", tBrushed);
    }
    if (ts.showBrushTooltip) {
      brush.on("brush.show", (event) => tShowTooltip(event, brushObject));
    }
    brush.on("end", onBrushEnd);

    brushCount++;
  }

  function getSelectionDomain(selection) {
    return selection.map(([x, y]) => [scaleX.invert(x), scaleY.invert(y)]);
  }

  // Update brush intersections when moved
  function brushed({ selection, sourceEvent }, brush) {
    //log("brushed", brush, arguments);
    if (!brush[1]) {
      // TODO
      log("**\uD83D\uDEAB ERROR brushed called without a brush[1]", brush);
      return;
    }

    // dont execute this method when move brushes programatically (sourceEvent === null) or when there is no selection
    if (sourceEvent === undefined || !selection) return;
    //log("brushed", brush);
    brush[1].selection = selection;
    brush[1].selectionDomain = getSelectionDomain(selection); // Calculate the selection coordinates in data domain
    if (updateBrush(brush)) {
      //Update intersections with modified brush
      brushFilter();
    }
  }

  function brushFilter() {
    dataNotSelected = [];
    dataSelected = new Map();
    brushesGroup.forEach((d, key) => dataSelected.set(key, []));

    if (brushSize > 0) {
      for (let d of data) {
        let isSelected = false;
        for (let [groupId, brushGroup] of brushesGroup.entries()) {
          if (intersectGroup(d, brushGroup.brushes)) {
            dataSelected.get(groupId).push(d);
            isSelected = true;
          }
        }
        if (!isSelected) {
          dataNotSelected.push(d);
        }
      }
    } else {
      dataNotSelected = data;
    }

    selectionCallback(dataSelected, dataNotSelected, brushSize !== 0);
  }

  function removeBrush([id, brush]) {
    brushSize--;
    brushesGroup.get(brush.group).brushes.delete(id);

    drawBrushes();
    brushFilter();
    updateStatus();
    brushTooltip.__hide();
  }

  function updateStatus() {
    // TODO
    statusCallback();
  }

  function updateGroups() {
    groupsCallback(brushesGroup);
  }

  function updateSelectedCoordinates({ selection }) {
    let selectionDomain = getSelectionDomain(selection);
    changeSelectedCoordinatesCallback(selectionDomain);
  }

  // Calculates whether a line intersects a complete brushGroup.
  function intersectGroup(data, group) {
    if (group.size === 0) return false;

    // If the group only have a 1 uninitialized brush not have intersection
    if (group.size === 1 && !group.values().next().value.intersections)
      return false;

    let intersect = true;
    let anyAnd = false;
    for (const brush of group.values())
      if (brush.intersections) {
        //initialize brush only
        switch (brush.aggregation) {
          case BrushAggregation.And:
            intersect = intersect && brush.intersections.has(data[0]);
            anyAnd = true;
            break;
          case BrushAggregation.Or:
            if (brush.intersections.has(data[0])) return true;
        }
      }
    return intersect && anyAnd;
  }

  // Update the intersection of all selected brushes
  function updateSelection() {
    let someUpdate = false;
    for (const brushGroup of brushesGroup.values()) {
      for (const brush of brushGroup.brushes) {
        if (brush[1].isSelected) {
          let update = updateBrush(brush); //avoid lazy evaluation
          someUpdate = someUpdate || update;
        }
      }
    }
    if (someUpdate) {
      brushFilter();
    }
  }

  function moveBrush([brushId, brush], distX, distY) {
    let [[x0, y0], [x1, y1]] = brush.selection;
    x0 += distX;
    x1 += distX;
    y0 += distY;
    y1 += distY;
    gBrushes.selectAll("#brush-" + brushId).call(brush.brush.move, [
      [x0, y0],
      [x1, y1],
    ]);
    brush.selection = [
      [x0, y0],
      [x1, y1],
    ];
    brush.selectionDomain = getSelectionDomain(brush.selection);
  }

  // Move all selected brushes the same amount of the triggerBrush
  function moveSelectedBrushes({ selection, sourceEvent }, trigger) {
    // dont execute this method when move brushes programatically
    if (sourceEvent === undefined) return;
    if (!Array.isArray(trigger) || trigger.length !== 2) {
      log(
        "\uD83D\uDC41\uFE0F moveSelectedBrushes called without array trigger returning",
        trigger
      );
      return;
    }

    const [triggerId, triggerBrush] = trigger;
    if (!selection || !triggerBrush.isSelected) return;

    let [[x0, y0]] = selection;
    let distX = x0 - triggerBrush.selection[0][0];
    let distY = y0 - triggerBrush.selection[0][1];
    triggerBrush.selection = selection;
    triggerBrush.selectionDomain = getSelectionDomain(selection);
    for (const brushGroup of brushesGroup.values()) {
      for (const [brushId, brush] of brushGroup.brushes) {
        if (brush.isSelected && !(triggerId === brushId)) {
          moveBrush([brushId, brush], distX, distY);
        }
      }
    }

    if (ts.autoUpdate) {
      tUpdateSelection();
    }
  }

  // Calculate the intersection of one brush with all the lines. Returns true if any changes have been made
  function updateBrush([brushId, brush]) {
    let [[x0, y0], [x1, y1]] = brush.selection;
    let newIntersections = null;
    // TODO Another form to do that is to assing the brush the function to calculate the intersection. It would make the code shorter, but I think less readable.
    switch (brush.mode) {
      case BrushModes.Intersect:
        newIntersections = BVH_.intersect(x0, y0, x1, y1);
        break;
      case BrushModes.Contains:
        newIntersections = BVH_.contains(x0, y0, x1, y1);
        break;
      default:
        newIntersections = BVH_.intersect(x0, y0, x1, y1);
        log(
          "\uD83D\uDEAB ERROR The method elected to compute the selection are not support, using default intersection instead "
        );
    }

    if (brush.negate) {
      let allKeys = new Set(data.map(d => d[0]));
      for (const key of newIntersections) {
        allKeys.delete(key);
      }
      newIntersections = allKeys;
    }

    // Draw the handles in contains brushes
    updateBrushHandles();

    let updated = !compareSets(newIntersections, brush.intersections);
    brush.intersections = newIntersections;

    return updated;
  }

  // Update the brush look and feel depending on the mode and aggregation
  function updateBrushHandles() {
    gBrushes.selectAll(".brush").each(function ([, brush]) {
      // Color the handles different if the brush is contains
      d3.select(this)
        .selectAll(".handle--w, .handle--e")
        .style(
          "fill",
          brush.mode === BrushModes.Contains
            ? darken(computeColor(brush.group))
            : "none"
        )
        .style("opacity", 0.4);

      // Color the handles different if the brush is negate
      d3.select(this)
          .selectAll(".handle--n, .handle--s")
          .style("fill", brush.negate ? "red" : "none")
          .style("opacity", 0.4);

      // Brush tooltip help text
      d3.select(this)
        .selectAll("title")
        .data([0]) // hack to create the title only once used instead of .append("title")
        .join("title")
        .text(
          `Mode: ${
            brush.mode === BrushModes.Contains ? "Contains" : "Intersect"
          }\nAggregation: ${
            brush.aggregation === BrushAggregation.And ? "And" : "Or"
          }\nRight click for options`
        );
    });
  }

  function selectBrush(brush) {
    brush[1].isSelected = !brush[1].isSelected;
    updateGroups();
    selectedBrushCallback(brush);
  }

  function deselectAllBrushes() {
    for (let brushGroup of brushesGroup.values()) {
      for (let brush of brushGroup.brushes) {
        brush[1].isSelected = false;
      }
    }
  }

  function getUnusedIdBrushGroup() {
    let keys = Array.from(brushesGroup.keys()).sort();
    let lastKey = -1;

    for (let key of keys) {
      if (lastKey + 1 !== key) {
        break;
      }
      lastKey++;
    }

    lastKey++;
    return lastKey;
  }

  function brushShadowIfSelected(d) {
    return selectedBrush && d[0] === selectedBrush[0] ? brushShadow : "";
  }

  function showBrushTooltip({ selection, sourceEvent }, brush) {
    if (!selection || sourceEvent === undefined) return;

    let selectionInverted = selection.map(([x, y]) => [
      scaleX.invert(+x),
      scaleY.invert(+y),
    ]);

    brushWithTooltip = brush;
    brushTooltip.__update({
      selection: selectionInverted,
      selectionPixels: selection,
    });
  }

  // Called by drawBrushes
  function drawOneBrush(d) {
    const brushValue = d[1];

    d3.select(this)
      .selectAll(".selection")
      .style("outline", "-webkit-focus-ring-color solid 0px")
      .style("fill", computeColor(brushValue.group))
      .style(
        "stroke-width",
        brushValue.group === brushGroupSelected ? "2px" : "0.5px"
      )
      // .style("outline-style", brushValue.isSelected ? "dashed" : "solid")
      .style("stroke-dasharray", brushValue.isSelected ? "4" : "")
      .style("stroke", darken(computeColor(brushValue.group)))
      .style("outline-color", darken(computeColor(brushValue.group)))
      .style("fill", computeColor(brushValue.group))
      .attr("tabindex", 0)
      .on("mousedown", (sourceEvent) => {
        if (sourceEvent.button === 0) {
          //Do that in left click
          let selection = brushValue.selection;
          updateSelectedCoordinates({ selection });
          selectedBrush = selectedBrush && d[0] === selectedBrush[0] ? null : d;
          selectedBrushCallback(selectedBrush);

          // Show shadow on current brush
          gBrushes
            .selectAll(".brush")
            .style("-webkit-filter", brushShadowIfSelected)
            .style("filter", brushShadowIfSelected);

          if (sourceEvent.shiftKey) {
            selectBrush(d);
          }
        }
      })
      .on("contextmenu", (sourceEvent) => {
        sourceEvent.preventDefault();
        let px = brushValue.selection[0][0];
        let py = brushValue.selection[0][1];
        brushContextMenu.__show(
          brushValue.mode,
          brushValue.aggregation,
          brushValue.negate,
          px,
          py,
          d
        );
      });

    if (ts.showBrushTooltip) {
      d3.select(this)
        .selectAll(":not(.overlay)")
        .on("mousemove", (sourceEvent) => {
          let selection = brushValue.selection;
          showBrushTooltip({ selection, sourceEvent }, d);
        });
    }
  }

  function selectBrushGroup(id) {
    if (brushGroupSelected === id) return;

    let oldBrushGroupSelected = brushesGroup.get(brushGroupSelected);
    oldBrushGroupSelected.isActive = false;
    deselectAllBrushes();

    brushesGroup.get();
    brushGroupSelected = id;
    brushesGroup.get(id).isActive = true;
    brushesGroup.get(id).isEnable = true;
    drawBrushes();
  }

  function computeColor(groupId) {
    // Not do if(tsLevel) because if(0) is false.
    if (tsLevel !== undefined) return ts.brushesColorScale[groupId](tsLevel);

    if (ts.brushesColorScale instanceof Array)
      return ts.brushesColorScale[groupId](tsLevel);

    return ts.brushesColorScale(groupId);
  }

  // Change one brush to a new BrushGroup
  function changeBrushOfGroup([brushId, brush], newBrushGroupId) {
    brushesGroup.get(brush.group).brushes.delete(brushId);
    brush.group = newBrushGroupId;
    brushesGroup.get(newBrushGroupId).brushes.set(brushId, brush);
  }

  function drawBrushes() {
    let brushes = [];
    brushesGroup.forEach(
      (d) => (brushes = brushes.concat(Array.from(d.brushes)))
    );
    brushes.sort((a, b) => d3.descending(a[0], b[0]));

    const brushesSelection = gBrushes
      .selectAll(".brush")
      .data(brushes, (d) => d[0])
      .join("g")
      .attr("class", "brush")
      .attr("id", ([id]) => "brush-" + id)
      .each(function ([, brush]) {
        // Actually create the d3 brush
        const sel = d3.select(this).call(brush.brush);

        return sel;
      })
      .style("-webkit-filter", brushShadowIfSelected)
      .style("filter", brushShadowIfSelected)
      .style("display", (d) =>
        brushesGroup.get(d[1].group).isEnable ? "" : "none"
      ) // Hide brushes when their group is not enabled
      .style("pointer-events", (d) =>
        d[1].group === brushGroupSelected ? "all" : "none"
      ) // disable interaction with not active brushes.
      .each(drawOneBrush);

    brushesSelection.each(function (d) {
      d3.select(this)
        .selectAll(".overlay")
        .style("pointer-events", () => {
          return brushCount - 1 === d[0] ? "all" : "none";
        });
    });

    brushesSelection.each(function ([id, brush]) {
      // Are we creating a brush for a predefined filter?
      if (brush.initialSelection) {
        log("\uD83C\uDF89 setting initial selection", brush.initialSelection);

        // Update brushColor
        d3.select(this)
          .selectAll(".selection")
          .style("stroke", darken(computeColor(brush.group)))
          .style("outline-color", darken(computeColor(brush.group)))
          .style("fill", computeColor(brush.group));

        // // if so set the new brush programatically, and delete the initial selection
        me.moveBrush([id, brush], brush.initialSelection);
        // d3.select(this).call(
        //   brush.brush.move,
        //   // [[52, 254], [237, 320]]
        //   // convert to pixels
        //   brush.initialSelection.map(([px, py]) => [scaleX(px), scaleY(py)])
        // );
        brush.initialSelection = undefined;
      }
    });
  }

  me.updateBrushGroupName = function (id, name) {
    brushesGroup.get(id).name = name;
    updateGroups();
    updateStatus();
  };

  me.addBrushGroup = function () {
    // In case of a multivariate TS, it is not possible to add more groups than defined color families.
    if (
      tsLevel !== undefined &&
      brushesGroup.size === ts.brushesColorScale.length
    ) {
      log(
        "Another group cannot be added because there is no defined color family. "
      );
      return;
    }
    let newId = getUnusedIdBrushGroup();
    let brushGroup = {
      isEnable: true,
      isActive: false,
      name: "Group " + (newId + 1),
      brushes: new Map(),
    };

    brushesGroup.set(newId, brushGroup);
    dataSelected.set(newId, []);
    selectBrushGroup(newId);

    selectionCallback(dataSelected, dataNotSelected, brushSize !== 0);
    updateStatus();
    updateGroups();
  };

  me.changeBrushGroupState = function (id, newState) {
    if (brushesGroup.get(id).isEnable === newState) return; //same state so no update needed

    brushesGroup.get(id).isEnable = newState;

    if (!newState) {
      // Hide tooltip if it was in a brush of that group.
      if (selectedBrush && selectedBrush[1].group === id) {
        brushTooltip.__hide();
      }
    }

    drawBrushes();
    updateStatus();
    updateGroups();
  };

  me.selectBrushGroup = function (id) {
    selectBrushGroup(id);
    updateStatus();
    updateGroups();
  };

  me.getBrushesGroupSize = function () {
    return brushesGroup.length;
  };

  me.removeBrushGroup = function (id) {
    if (brushesGroup.length <= 1) return;

    let itKeys = brushesGroup.keys();
    let newId = itKeys.next().value;
    newId = newId === id ? itKeys.next().value : newId;

    let brushGroupToDelete = brushesGroup.get(id);

    for (let [id, brush] of brushGroupToDelete.brushes.entries()) {
      // delete all brushes of the group to be deleted, except the brush prepared to create a new timeBox
      if (brush.selection !== null) {
        removeBrush([id, brush]);
      } else {
        // Change the brush prepared to create a new timeBox to another group
        brush.group = newId;
        brushesGroup.get(newId).brushes.set(id, brush);
        brushGroupToDelete.brushes.delete(id);
      }
    }

    // Select new active group if needed
    if (brushGroupSelected === id) {
      brushesGroup.get(newId).isActive = true;
      brushGroupSelected = newId;
    }

    brushesGroup.delete(id);

    updateGroups();
  };

  me.getEnableGroups = function () {
    let enable = new Set();
    brushesGroup.forEach((d, id) => {
      if (d.isEnable) {
        enable.add(id);
      }
    });
    return enable;
  };

  me.getBrushesGroup = function () {
    //return brushesGroup;

    // Return a copy of brushesGroups without the uninitialized brushes
    let filterBrushesGroup = new Map();

    // Deep copy
    brushesGroup.forEach((g, gId) => {
      let o = Object.assign({}, g);
      o.brushes = new Map(g.brushes);
      filterBrushesGroup.set(gId, o);
    });

    filterBrushesGroup.forEach((group) => {
      group.brushes.forEach((brush, brushId) => {
        if (brush.selection === null) group.brushes.delete(brushId);
      });
    });
    return filterBrushesGroup;
  };

  me.getBrushGroupSelected = function () {
    return brushGroupSelected;
  };

  me.removeSelectedBrush = function () {
    if (selectedBrush) removeBrush(selectedBrush);
  };

  me.getSelectedBrush = function () {
    return selectedBrush;
  };

  me.hasSelection = function () {
    return brushSize !== 0;
  };

  me.deselectBrush = function () {
    if (selectedBrush) {
      selectedBrush = null;
      drawBrushes();
      selectedBrushCallback(selectedBrush);
    }
  };

  me.changeSelectedBrushMode = function (brushMode) {
    selectedBrush.mode = brushMode;
    updateBrush(selectedBrush);
  };

  me.changeSelectedBrushAggregation = function (brushAggregation) {
    selectedBrush.aggregation = brushAggregation;
    brushFilter();
  };

  me.moveBrush = function (
    [brushID, brushValue],
    selection,
    moveSelection = false
  ) {
    let [[x0, y0], [x1, y1]] = selection;
    //Domain coordinates
    let minX = scaleX.domain()[0];
    let maxX = scaleX.domain()[1];
    let minY = scaleY.domain()[0];
    let maxY = scaleY.domain()[1];

    x0 = Math.max(x0, minX);
    x1 = Math.min(x1, maxX);
    y0 = Math.min(y0, maxY);
    y1 = Math.max(y1, minY);

    // if the X axis is a Date return to Date after clamping
    if (minX instanceof Date) {
      x0 = new Date(x0);
      x1 = new Date(x1);
    }

    if (x0 > x1) {
      [x0, x1] = [x1, x0];
    }

    if (y0 < y1) {
      [y0, y1] = [y1, y0];
    }

    let x0p = scaleX(x0);
    let x1p = scaleX(x1);
    let y0p = scaleY(y0);
    let y1p = scaleY(y1);

    //log("moveBrush", brushID, brushValue, arguments[1]);
    gBrushes.selectAll("#brush-" + brushID).call(brushValue.brush.move, [
      [x0p, y0p],
      [x1p, y1p],
    ]);

    selection = [
      [x0p, y0p],
      [x1p, y1p],
    ];
    let selectionDomain = [
      [x0, y0],
      [x1, y1],
    ];

    let sourceEvent = new Event("move"); // fake event to be able to call brushed programmatically
    if (moveSelection) {
      moveSelectedBrushes({ selection, sourceEvent }, [brushID, brushValue]);
    } else {
      brushed({ selection, sourceEvent }, [brushID, brushValue]);
      brushTooltip.__update({
        selection: selectionDomain,
        selectionPixels: selection,
      });
    }
  };

  me.moveSelectedBrush = function (
    [[x0, y0], [x1, y1]],
    moveSelection = false
  ) {
    //log("Move selected brush", selectedBrush);
    if (!selectedBrush) {
      log(
        "\uD83D\uDEAB ERROR moveSelectedBrush called but selectedBrush is falsy ",
        selectedBrush
      );
      return;
    }

    me.moveBrush(
      selectedBrush,
      [
        [x0, y0],
        [x1, y1],
      ],
      moveSelection
    );
  };

  function generateBrush(
    brush,
    mode,
    aggregation,
    group,
    selection,
    selectionDomain,
    initialSelection
  ) {
    return {
      brush: brush,
      intersections: null,
      mode: mode,
      aggregation: aggregation,
      negate: false,
      isSelected: false,
      group: group,
      selection: selection,
      selectionDomain: selectionDomain,
      initialSelection: initialSelection,
    };
  }
  me.invertQuery = function (brushGroup) {
    let brushes = brushesGroup.get(brushGroup).brushes;
    let miny = Number.MAX_VALUE;
    let maxy = Number.MIN_VALUE;
    brushes.forEach((brush) => {
      if (!brush.selection) return;
      miny = Math.min(brush.selection[0][1], miny);
      maxy = Math.max(brush.selection[1][1], maxy);
    });
    let midPointQuery = (maxy - miny) / 2 + miny;
    brushes.forEach((brush, brushId) => {
      if (!brush.selection) return;
      let brushHeight = brush.selection[1][1] - brush.selection[0][1];
      let brushMidPoint = brushHeight / 2 + brush.selection[0][1];
      let distY = midPointQuery - brushMidPoint;
      moveBrush([brushId, brush], 0, distY * 2);
    });

    tUpdateSelection();
  };

  me.invertQuerySelectedGroup = function () {
    me.invertQuery(brushGroupSelected);
  };

  me.addFilters = function (filters, wipeAll = false) {
    if (filters instanceof Map) {
      filters = Array.from(filters.values());
      filters.forEach((f) => (f.brushes = Array.from(f.brushes.values())));
    }

    if (filters.length === 0) return;

    if (wipeAll) {
      brushesGroup.clear();
    } else {
      // Remove the brush prepared to generate new TimeBox. Will be added later.
      brushesGroup.forEach((group) => {
        group.brushes.forEach((brush, id) => {
          if (!brush.selection) group.brushes.delete(id);
        });
      });
    }

    for (let group of filters) {
      let groupId = getUnusedIdBrushGroup();
      let brushGroup = {
        isEnable: group.isEnable ? group.isEnable : true,
        isActive: group.isActive ? group.isActive : false,
        name: group.name,
        brushes: new Map(),
      };
      brushesGroup.set(groupId, brushGroup);
      dataSelected.set(groupId, []);

      for (const brush of group.brushes) {
        if (!isInsideDomain(brush.selectionDomain, scaleX, scaleY)) {
          // If the provided domain is out of bounds use the pixel selection. If not, set default value.
          if (brush.selection)
            brush.selectionDomain = getSelectionDomain(brush.selection);
          else
            brush.selectionDomain = getSelectionDomain([
              [0, 100],
              [0, 100],
            ]);
        }
        newBrush(brush.mode, brush.aggregation, groupId, brush.selectionDomain);
        brushSize++; // The brushSize will not be increased in onStartBrush
        // because the last brush added will be the one set for a new Brush.
      }
    }

    newBrush(); // Add another brush that handle the possible new TimeBox

    brushFilter();
    drawBrushes();
  };

  me.drawBrushes = function () {
    drawBrushes();
  };

  me.setTsPosition = function (position) {
    tsLevel = position;
    //drawBrushes();
  };

  // add brush group without funct to avoid callback
  let newId = getUnusedIdBrushGroup();
  let brushGroup = {
    isEnable: true,
    isActive: true,
    name: "Group " + (newId + 1),
    brushes: new Map(),
  };

  brushesGroup.set(newId, brushGroup);
  dataSelected.set(newId, []);
  brushGroupSelected = newId;
  brushesGroup.get(newId).isEnable = true;

  newBrush();
  drawBrushes();

  return me;
}

function TimeWidget(
  data,
  {
    /* Elements */
    target = document.createElement("div"), // pass a html element where you want to render
    showBrushesControls = true, // If false you can still use brushesControlsElement to show the control on a different element on your app. For this use the exported value "groups"
    showBrushTooltip = true, // Allows to display a tooltip on the brushes containing its coordinates.
    showBrushesCoordinates = true, // If false you can still use brushesCoordinatesElement to show the control on a different element on your app. For this use the exported value "brushesCoordinates"
    showDetails = true, // If false and with hasDetails = true, you can still use detailsElement to show the control on a different element on your app. For this use the exported value "details"
    /* Data */
    x = (d) => d.x, // Attribute to show in the X axis (Note that it also supports functions)
    y = (d) => d.y, // Attribute to show in the Y axis (Note that it also supports functions)
    id = (d) => d.id, // Attribute to group the input data (Note that it also supports functions)
    color = null, //Specifies the attribute to be used to discriminate the groups (Note that it also supports functions).
    referenceCurves = null, // Specifies a Json object with the information of the reference lines.
    fmtX, // Function, how to format x points in the tooltip. If not provided will try to guess if it is a date or a number
    fmtY = d3.format(".1f"), // Function, how to format x points in the tooltip
    stepX = { days: 10 }, // Defines the step used, both in the spinboxes and with the arrows on the X axis.
    stepY = 1, // // Defines the step used, both in the spinboxes and with the arrows on the Y axis.
    xScale, //It allows to pass a scale of d3 with its parameters, except for the domain which is defined by the xDomain parameter.
    yScale = d3.scaleLinear(), //It allows to pass a scale of d3 with its parameters, except for the domain which is defined by the yDomain parameter.
    xDomain, // Defines the domain to be used in the x scale.
    yDomain, // Defines the domain to be used in the y scale.
    yLabel = "",
    xLabel = "",
    xTicks, //Allows to use custom strings as ticks on the X-axis independently of the X-scale. A vector of [xValue,Label] pairs is expected. Note that only the defined elements are displayed.
    yTicks, //Allows to use custom strings as ticks on the y-axis independently of the y-scale. A vector of [yValue,Label] pairs is expected. Note that only the defined elements are displayed.
    filters = [], // Array of filters to use, format [[x1, y1], [x2, y2], ...]
    /* Color Configuration */
    defaultAlpha = 0.7, // Default transparency (when no selection is active) of drawn lines
    selectedAlpha = 1.0, // Transparency of selected lines
    noSelectedAlpha = 0.1, // Transparency of unselected lines
    alphaScale = d3.scalePow().exponent(0.25).range([1, 1]), // A scale to adjust the alpha by the number of rendering elements
    backgroundColor = "#ffffff",
    defaultColor = "#aaa", // Default color (when no selection is active) of the drawn lines. It only has effect when "color" is not defined.
    selectedColor = "#aaa", // Color of selected lines. It only has effect when "color" is not defined.
    noSelectedColor = "#dce0e5", // Color of unselected lines. It only has effect when "color" is not defined.
    colorScale = d3.scaleOrdinal(d3.schemeAccent), // The color scale to be used to display the different groups defined by the "color" attribute.
    brushesColorScale = color
      ? d3.scaleOrdinal(d3.schemeGreys[3].toReversed())
      : d3.scaleOrdinal(d3.schemeTableau10), // The color scale to be used to display the brushes
    selectedColorTransform = (color, groupId) =>
      d3.color(color).darker(groupId), // Function to be applied to the color of the selected group. It only has effect when "color" is defined.
    /* Size Configuration */
    width = 800, // Set the desired width of the overview Widget
    detailsWidth = 400, // Set the desired width of the details Widget
    height = 600, // Set the desired height of the overview Widget
    detailsHeight = 300, // Set the desired height of the details Widget
    detailsContainerHeight = 400, // Set the desired height of the details Widget
    margin = { left: 50, top: 30, bottom: 50, right: 50 },
    detailsMargin = null, // Margin options for details view, d3 common format, leave null for using the overview margin
    /* CallBacks */
    updateCallback = () => {}, // (data) => doSomethingWithData
    statusCallback = () => {}, // (status) => doSomethingWithStatus
    /* Rendering */
    brushShadow = "drop-shadow( 2px 2px 2px rgba(0, 0, 0, .7))",
    showGroupMedian = true, // If active show a line with the median of the enabled groups.
    hasDetails = false, // Determines whether detail data will be displayed or not. Disabling it saves preprocessing time if detail data is not to be displayed.
    doubleYlegend = false, // Allows the y-axis legend to be displayed on both sides of the chart.
    showGrid = false, // If active, a reference grid is displayed.
    brushGroupSize = 15, //Controls the size of the colored rectangles used to select the different brushGroups.
    /* Performance */
    maxDetailsRecords = 10, // How many results to show in the detail view
    maxTimelines = null, // Set to a value to limit the number of distinct timelines to show
    xPartitions = 10, // Partitions performed on the X-axis for the collision acceleration algorithm.
    yPartitions = 10, // Partitions performed on the Y-axis for the collision acceleration algorithm.
    /* Options */
    medianNumBins = 10, // Number of bins used to compute the group median.
    medianLineDash = [7], // Selected group median line dash pattern canvas style
    medianLineAlpha = 1, // Selected group median line opacity
    medianLineWidth = 2, // Selected group median line width
    medianFn = d3.median, // Function to use when showing the median
    medianMinRecordsPerBin = 5, // Min number of records each bin must have to be considered
    autoUpdate = true, // Allows to decide whether changes in brushes are processed while moving, or only at the end of the movement.
    _this, // pass the object this in order to be able to maintain the state in case of changes in the input
    fixAxis, // When active, the axes will not change when modifying the data.
    /* Legacy or to be deleted */
    groupAttr = null, // DEPRECATED use color instead: Specifies the attribute to be used to discriminate the groups (Note that it also supports functions).
    overviewWidth, // Legacy, to be deleted
    overviewHeight, // Legacy, to be deleted
    tsParent, // Set other TimeWidget parent to connect them.
    highlightAlpha = 1, // Transparency oh the highlighted lines (lines selected in other TS)
  } = {}
) {
  width = overviewWidth || width;
  height = overviewHeight || height;
  detailsMargin = detailsMargin || margin;

  let ts = {},
    groupedData,
    fData,
    overviewX,
    overviewY,
    divOverview,
    divRender,
    divControls,
    divData,
    brushesCoordinates,
    detailsElement,
    groupsElement,
    svg,
    gGroupBrushes,
    gBrushes,
    gReferences,
    brushSpinBoxes = null,
    medianBrushGroups,
    dataSelected,
    dataNotSelected,
    renderSelected, // Selected data to render. Depends on selected DataGroup and the selection of other TS
    renderNotSelected, // Non Selected data to render. Depends on selected DataGroup and the selection of other TS
    showNonSelected, // Determines if unselected data is rendered
    selectedGroupData,
    hasScaleTime,
    timelineDetails, // Centralizes the details component
    timelineOverview, // Centralizes the overview component
    tsElements, // Stores the HTML target of all connected TimeWidgets
    tsElementsSelection, // Stores the selection made by other connected TimeWidgets
    positionTs, // Stores the position of the current TimeWidget. 0 is the top.
    otherSelectionToHightlight, // Determines what group and certain ts level must be highlighted
    brushes;

  // Exported Parameters
  ts.xPartitions = xPartitions;
  ts.yPartitions = yPartitions;
  ts.defaultAlpha = defaultAlpha;
  ts.selectedAlpha = selectedAlpha;
  ts.noSelectedAlpha = noSelectedAlpha;
  ts.backgroundColor = backgroundColor;
  ts.defaultColor = defaultColor;
  ts.selectedColor = selectedColor;
  ts.noSelectedColor = noSelectedColor;
  ts.hasDetails = hasDetails;
  ts.margin = margin;
  ts.colorScale = colorScale;
  ts.brushesColorScale = brushesColorScale;
  ts.color = color;
  ts.doubleYlegend = doubleYlegend;
  ts.showGrid = showGrid;
  ts.showBrushTooltip = showBrushTooltip;
  ts.autoUpdate = autoUpdate;
  ts.brushGroupSize = brushGroupSize;
  ts.stepX = stepX;
  ts.stepY = stepY;
  ts.medianLineAlpha = medianLineAlpha;
  ts.medianLineWidth = medianLineWidth;
  ts.medianLineDash = medianLineDash;
  ts.medianNumBins = medianNumBins;
  ts.medianFn = medianFn;
  ts.alphaScale = alphaScale;
  ts.medianMinRecordsPerBin = medianMinRecordsPerBin;
  ts.yScale = yScale;
  ts.xScale = xScale;
  ts.highlightAlpha = highlightAlpha;
  ts.selectedColorTransform = selectedColorTransform;

  //Backwards compatibility with groupAttr.
  if (groupAttr) {
    console.warn('The attribute "groupAttr" is deprecated use "color" instead');
    color = groupAttr;
  }

  // Convert attrStrings to functions
  if (typeof x === "string") {
    let _x = x;
    x = (d) => d[_x];
  }
  if (typeof y === "string") {
    let _y = y;
    y = (d) => d[_y];
  }
  if (typeof id === "string") {
    let _id = id;
    id = (d) => d[_id];
  }
  if (color && typeof color === "string") {
    let _color = color;
    color = (d) => d[_color];
  }

  divOverview = d3
    .select(target)
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("position", "relative")
    .style("top", "0px")
    .style("left", "0px")
    .style("background-color", ts.backgroundColor)
    .node();

  // Listen to customEvent to connect TimeWidgets
  d3.select(target).on("TimeWidget", onTimeWidgetEvent);
  d3.select(target).on("input", onInput);

  divControls =
    divControls ||
    d3.select(target).select("#control").node() ||
    d3.create("div").attr("id", "control").node();
  brushesCoordinates =
    brushesCoordinates ||
    d3.select(target).select("#brushesCoordinates").node() ||
    d3.create("div").attr("id", "brushesCoordinates").node();
  groupsElement =
    groupsElement ||
    d3.select(target).select("#brushesGroups").node() ||
    d3.create("div").attr("id", "brushesGroups").node();
  medianBrushGroups = new Map();
  dataSelected = new Map();
  dataNotSelected = [];
  selectedGroupData = new Set();
  showNonSelected = true;
  //positionTs = 0;
  tsElementsSelection = [];

  function initBrushesControls() {
    groupsElement.innerHTML = `<div style="flex-basis:100%;">
    <div id="brushesList">
    </div>
    <button id="btnAddBrushGroup">Add Group</button>
    </div>`;

    groupsElement
      .querySelector("button#btnAddBrushGroup")
      .addEventListener("click", onAddBrushGroup);

    if (showBrushesControls) {
      d3.select(groupsElement).insert("h3", ":first-child").text("Groups:");
      divControls.appendChild(groupsElement);
    }
  }

  function computeBrushColor(groupId) {
    if (positionTs !== undefined)
      return ts.brushesColorScale[groupId](positionTs);

    if (ts.brushesColorScale instanceof Array)
      return ts.brushesColorScale[groupId](positionTs);

    return ts.brushesColorScale(groupId);
  }

  function onAddBrushGroup() {
    brushes.addBrushGroup();

    //Sent event to others TS
    if (tsElements) {
      let event = new CustomEvent("TimeWidget", {
        detail: {
          type: eventType.addBrushGroup,
        },
      });
      sentEvent(event);
    }
  }

  function onChangeNonSelected(newState) {
    showNonSelected = newState;

    if (tsElements) {
      let event = new CustomEvent("TimeWidget", {
        detail: {
          type: eventType.changeNonSelected,
          data: {
            newState: newState,
          },
        },
      });
      sentEvent(event);
    }
  }

  function onChangeBrushGroupState(id, newState) {
    brushes.changeBrushGroupState(id, newState);

    //Sent event to ohter Ts
    if (tsElements) {
      let event = new CustomEvent("TimeWidget", {
        detail: {
          type: eventType.changeBrushGroupState,
          data: {
            id: id,
            newState: newState,
          },
        },
      });
      sentEvent(event);
    }
  }

  function onInput() {
    log("Oninput test");
  }

  function onRemoveBrushGroup(id) {
    brushes.removeBrushGroup(id);

    // Sent event to others TS
    if (tsElements) {
      let event = new CustomEvent("TimeWidget", {
        detail: {
          type: eventType.removeBrushGroup,
          data: id,
        },
      });

      sentEvent(event);
    }
  }

  function onSelectBrushGroup(id) {
    brushes.selectBrushGroup(id);
    // Sent event to others TS
    if (tsElements) {
      let event = new CustomEvent("TimeWidget", {
        detail: {
          type: eventType.selectBrushGroup,
          data: id,
        },
      });

      sentEvent(event);
    }
  }

  function onChangeSelectedBrush(brush) {
    if (tsElements) {
      if (brush) {
        let event = new CustomEvent("TimeWidget", {
          detail: {
            type: eventType.deselectAllBrushes,
          },
        });
        sentEvent(event);
      }

      let event;
      if (brush) {
        event = new CustomEvent("TimeWidget", {
          detail: {
            type: eventType.highlightSelection,
            data: {
              positionTs: positionTs,
              groupId: brush[1].group,
            },
          },
        });
      } else {
        event = new CustomEvent("TimeWidget", {
          detail: {
            type: eventType.highlightSelection,
          },
        });
      }
      sentEvent(event);
    }
  }

  function renderBrushesControls() {
    d3.select(groupsElement)
      .select("#brushesList")
      .selectAll(".brushControl")
      .data(brushes.getBrushesGroup(), (d) => d[0])
      .join("div")
      .attr("class", "brushControl")
      .each(function (d, i, n) {
        let groupsSize = n.length;

        const div = d3.select(this);
        let groupName = d[1].name;
        let groupCount = renderSelected.has(d[0])
          ? renderSelected.get(d[0]).length
          : 0;
        div.node().innerHTML = `<div style="
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
          ">
            <input type="checkbox" id="checkBoxShowBrushGroup" ${
              d[1].isEnable ? "checked" : ""
            } ></input>
            <div
              id="groupColor"
              style="
              min-width: ${ts.brushGroupSize}px;
              width: ${ts.brushGroupSize}px;
              height: ${ts.brushGroupSize}px;
              background-color: ${computeBrushColor(d[0])};
              border-width: ${
                d[0] === brushes.getBrushGroupSelected() ? 2 : 0
              }px;
              border-color: black;
              border-style: solid;
              margin-right: 5px;
              cursor: pointer;
            "></div>
            <input
              id="groupName"
              style="margin-right: 5px; border: none;outline: none; width: ${
                groupName.length
              }ch;"
              contenteditable="true"
              value="${groupName}"></input>
            <span id="groupSize" style="margin-right: 5px;">(${groupCount})</span>
           <button style="color: red;font-weight: bold; border:none; background:none;
            display:${
              groupsSize > 1 ? "block" : "none"
            }" id="btnRemoveBrushGroup">&cross;</button>
          </div>
        `;

        div.select("input#groupName").on("input", function (evt) {
          // Only update the name on change

          // make the input fit the content
          d3.select(this).style("width", evt.target.value.length + "ch");
        });
        div.select("input#groupName").on("change", (evt) => {
          // make the input fit the content
          d3.select(this).style("width", evt.target.value.length + "ch");
          brushes.updateBrushGroupName(d[0], evt.target.value);
          triggerValueUpdate();
        });
        div.select("#btnRemoveBrushGroup").on("click", (event) => {
          event.stopPropagation();
          onRemoveBrushGroup(d[0]);
        });
        div.select("#checkBoxShowBrushGroup").on("click", (event) => {
          //Prevent the event from reaching the element li
          event.stopPropagation();
        });
        div.select("#checkBoxShowBrushGroup").on("change", (event) => {
          event.stopPropagation();
          onChangeBrushGroupState(d[0], event.target.checked);
          console.log(
            "Should change state of brushesGroup " + d[0],
            event.target.checked
          );
        });

        // Select only on the box and size
        div
          .select("div#groupColor")
          .on("click", () => onSelectBrushGroup(d[0]));
        div
          .select("span#groupSize")
          .on("click", () => onSelectBrushGroup(d[0]));
      });

    // Render the nonSelected Group always on bottom of list
    d3.select(groupsElement)
      .select("#brushesList")
      .selectAll(".nonSelectedControl")
      .remove();

    d3.select(groupsElement)
      .select("#brushesList")
      .append("div")
      .attr("class", "nonSelectedControl")
      .each(function () {
        const li = d3.select(this);
        let groupName = "Non selected";
        let groupCount = renderNotSelected.length;

        li.node().innerHTML = `<div style="
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
            margin-bottom: 5px;
          ">
            <input type="checkbox" id="checkBoxShowBrushGroup" ${
              showNonSelected ? "checked" : ""
            } ></input>
            <output
              style="margin-right: 0; border: none;outline: none; width: ${
                groupName.length
              }ch;"
              >${groupName}</output>
            <span id="groupSize" style="margin-right: 5px;">(${groupCount})</span>
          </div>
        `;

        li.select("#checkBoxShowBrushGroup").on("change", (event) => {
          event.stopPropagation();
          onChangeNonSelected(event.target.checked);
          onSelectionChange();
        });
      });

    // Render internal brush  controls
    gGroupBrushes
      .selectAll(".colorBrushes")
      .data(brushes.getBrushesGroup(), (d) => d[0])
      .join("rect")
      .attr("class", "colorBrushes")
      .attr("id", (d) => "colorBrush-" + d[0])
      .attr("height", ts.brushGroupSize)
      .attr("width", ts.brushGroupSize)
      .attr(
        "transform",
        (d, i) => `translate(${90 + i * (ts.brushGroupSize + 5)}, -2)`
      )
      .style("stroke-width", (d) =>
        d[0] === brushes.getBrushGroupSelected() ? 2 : 0
      )
      .style("stroke", "black")
      .style("fill", (d) => computeBrushColor(d[0]))
      .on("click", function () {
        let id = d3.select(this).attr("id").substr("11");
        onSelectBrushGroup(+id);
      });
  }

  function initDomains({ xDataType, fData }) {
    if (!xDomain) {
      xDomain = fixAxis && _this ? _this.extent.x : d3.extent(fData, x); // Keep same axes as in the first rendering
    }

    overviewX = xScale ? xScale.copy() : undefined;

    if (xDataType === "object" && x(fData[0]) instanceof Date) {
      // X is Date
      hasScaleTime = true;
      if (!overviewX) overviewX = d3.scaleTime();
      overviewX.domain(xDomain);
      if (!fmtX) {
        // It is a function of type d3.timeFormat. I don't like the way to check that it is a function of that type, but I don't know a better one.
        fmtX = d3.timeFormat("%Y-%m-%d");
      } else if (fmtX.name === "M") {
        console.log(
          "\uD83D\uDC41\uFE0Ft has been detected that the parameter fmtX formats numerical data, while the data selected for " +
            'the X-axis is a date. The function d3.timeFormat("%Y-%m-%d") will be used as fmtX; '
        );
        fmtX = d3.timeFormat("%Y-%m-%d");
      }
    } else {
      // We if x is something else overviewX won't be assigned
      // if (xDataType === "number") {
      // X is number
      if (!overviewX) overviewX = d3.scaleLinear();
      overviewX.domain(xDomain);
      if (!fmtX) {
        fmtX = d3.format(".1f");
      }
    }

    overviewX.range([0, width - ts.margin.right - ts.margin.left]).nice();

    if (!yDomain) {
      yDomain = fixAxis && _this ? _this.extent.y : d3.extent(fData, y); // Keep same axes as in the first rendering
    }

    overviewY = yScale.copy();

    overviewY.domain(yDomain);

    overviewY
      .range([height - ts.margin.top - ts.margin.bottom, 0])
      .nice()
      .clamp(true);
  }

  function init() {
    //CreateOverView
    divData = d3
      .select(divControls)
      .selectAll("div#divData")
      .data([1])
      .join("div")
      .attr("id", "divData");

    divRender = d3
      .select(divOverview)
      .selectAll("div#render")
      .data([1])
      .join("div")
      .attr("id", "render")
      .style("position", "relative")
      .style("z-index", 1);

    timelineOverview = TimeLineOverview({
      ts,
      element: divRender.node(),
      width: width,
      height: height,
      x,
      y,
      groupAttr: color,
      overviewX,
      overviewY,
    });

    svg = divRender
      .selectAll("svg")
      .data([1])
      .join("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("height", height)
      .attr("width", width);

    const g = svg
      .selectAll("g.gDrawing")
      .data([1])
      .join("g")
      .attr("class", "gDrawing")
      .attr("transform", `translate(${ts.margin.left}, ${ts.margin.top})`)
      .attr("tabindex", 0)
      .style("pointer-events", "all")
      .style("outline", "-webkit-focus-ring-color solid 0px")
      .on("keydown", (e) => {
        e.preventDefault();
        switch (e.key) {
          case "r":
          case "Backspace":
          case "Delete":
            brushes.removeSelectedBrush();
            break;
          case "+":
            onAddBrushGroup();
            break;
          case "ArrowRight":
            onArrowRigth();
            break;
          case "ArrowLeft":
            onArrowLeft();
            break;
          case "ArrowUp":
            onArrowUp();
            break;
          case "ArrowDown":
            onArrowDown();
            break;
          case "i":
            brushes.invertQuerySelectedGroup();
            break;
        }
      });

    let yAxis = d3.axisLeft(overviewY);
    if (yTicks) {
      yAxis
        .tickValues(yTicks.map((d) => d[0]))
        .tickFormat((d, i) => (yTicks[i][1] ? yTicks[i][1] : yTicks[i][0]));
    }

    let gmainY = g
      .selectAll("g.mainYAxis")
      .data([1])
      .join("g")
      .attr("class", "mainYAxis")
      .call(yAxis)
      .call((axis) =>
        axis
          .selectAll("text.label")
          .data([1])
          .join("text")
          .text(yLabel)
          .attr("dy", -15)
          .attr("class", "label")
          .style("fill", "black")
          .style("text-anchor", "end")
          .style("pointer-events", "none")
      )
      .style("pointer-events", "none");

    if (ts.doubleYlegend) {
      g.selectAll("g.secondYaxis")
        .data([1])
        .join("g")
        .attr("class", "secondYaxis")
        .call(d3.axisRight(overviewY))
        .attr(
          "transform",
          `translate(${width - ts.margin.left - ts.margin.right},0)`
        )
        .style("pointer-events", "none");
    }

    let xAxis = d3.axisBottom(overviewX ? overviewX : g);
    if (xTicks) {
      xAxis
        .tickValues(xTicks.map((d) => d[0]))
        .tickFormat((d, i) => (xTicks[i][1] ? xTicks[i][1] : xTicks[i][0]));
    }

    let gmainx = g
      .selectAll("g.mainXAxis")
      .data([1])
      .join("g")
      .attr("class", "mainXAxis")
      .call(xAxis)
      .attr(
        "transform",
        `translate(0, ${height - ts.margin.top - ts.margin.bottom})`
      )
      .call((axis) =>
        axis
          .selectAll("text.label")
          .data([1])
          .join("text")
          .attr("class", "label")
          .text(xLabel)
          .attr(
            "transform",
            `translate(${width - ts.margin.right - ts.margin.left - 5}, -10 )`
          )
          .style("fill", "black")
          .style("text-anchor", "end")
          .style("pointer-events", "none")
      )
      .style("pointer-events", "none");

    gReferences = g
      .selectAll("g.gReferences")
      .data([1])
      .join("g")
      .attr("class", "gReferences")
      .style("pointer-events", "none");

    gmainY
      .selectAll("g.tick")
      .selectAll(".gridline")
      .data(ts.showGrid ? [1] : [])
      .join("line")
      .attr("class", "gridline")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", width - ts.margin.right - ts.margin.left)
      .attr("y2", 0)
      .attr("stroke", "#9ca5aecf") // line color
      .attr("stroke-dasharray", "4"); // make it dashed;;

    gmainx
      .selectAll("g.tick")
      .selectAll(".gridline")
      .data(ts.showGrid ? [1] : [])
      .join("line")
      .attr("class", "gridline")
      .attr("x1", 0)
      .attr("y1", -height + ts.margin.top + ts.margin.bottom)
      .attr("x2", 0)
      .attr("y2", 0)
      .attr("stroke", "#9ca5aecf") // line color
      .attr("stroke-dasharray", "4"); // make it dashed;

    if (color) {
      fData.forEach((d) => selectedGroupData.add(color(d)));
      selectedGroupData.size;
    }

    gGroupBrushes = svg
      .selectAll("g.colorBrushes")
      .data([1])
      .join("g")
      .attr("class", "colorBrushes")
      .attr(
        "transform",
        `translate(${ts.margin.left + 10},${
          ts.margin.top - ts.brushGroupSize - 5
        } )`
      );

    // TODO John: We might want to move this into brushInteraction
    gBrushes = g
      .selectAll("g#brushes")
      .data([1])
      .join("g")
      .attr("id", "brushes");

    brushes = brushInteraction({
      ts,
      element: gBrushes.node(),
      data: groupedData,
      tooltipTarget: divRender.node(),
      contextMenuTarget: divRender.node(),
      width,
      height,
      xPartitions,
      yPartitions,
      x,
      y,
      brushShadow,
      fmtY,
      fmtX: fmtX,
      scaleX: overviewX,
      scaleY: overviewY,
      updateTime: 150,
      tsLevel: positionTs,
      selectionCallback: onSelectionChange,
      groupsCallback: onBrushGroupsChange,
      changeSelectedCoordinatesCallback: onBrushCoordinatesChange,
      selectedBrushCallback: onChangeSelectedBrush,
    });

    gGroupBrushes
      .selectAll("text")
      .data([1])
      .join("text")
      .attr("x", 0)
      .attr("y", ts.brushGroupSize / 2 + 2)
      .text("Groups + : ")
      .style("cursor", "pointer")
      .on("click", onAddBrushGroup);

    divOverview.appendChild(divControls);
    initBrushCoordinates();
    initBrushesControls();

    return g;
  }

  // Callback that is called every time the coordinates of the selected brush are modified.
  function onBrushCoordinatesChange(selection) {
    updateBrushSpinBox(selection);
    updateStatus();
  }

  function updateBrushSpinBox(selection) {
    if (selection) {
      let [[x0, y0], [x1, y1]] = selection;

      // When initializing the brushes the spinbox is not ready
      if (brushSpinBoxes) {
        let [[sx0, sy0], [sx1, sy1]] = brushSpinBoxes;

        sx0.node().value = fmtX(x0);
        sx1.node().value = fmtX(x1);
        sy0.node().value = fmtY(y1).replace("\u2212", "-"); // Change D3 minus sign to parseable minus
        sy1.node().value = fmtY(y0).replace("\u2212", "-");
      } else {
        log(
          "updateBrushSpinBox called, but brushSpinBoxes not ready ",
          brushSpinBoxes
        );
      }
    } else {
      emptyBrushSpinBox();
    }
  }

  function emptyBrushSpinBox() {
    let [[sx0, sy0], [sx1, sy1]] = brushSpinBoxes;

    sx0.node().value = "";
    sx1.node().value = "";
    sy0.node().value = "";
    sy1.node().value = "";
  }

  function initBrushCoordinates() {
    brushesCoordinates.innerHTML = "";
    let selection = d3.select(brushesCoordinates);
    let divX = selection.append("div");

    divX.append("span").text(xLabel ? xLabel : "X Axis:");

    let divInputX = divX.append("div");

    let domainX = overviewX.domain();
    let x0 = divInputX
      .append("div")
      .append("input")
      .attr("type", hasScaleTime ? "Date" : "number")
      .attr("min", hasScaleTime ? fmtX(domainX[0]) : domainX[0])
      .attr("max", hasScaleTime ? fmtX(domainX[1]) : domainX[1])
      .attr("step", ts.stepX)
      .attr("width", "50%")
      // .style("background-color", ts.backgroundColor)
      .on("change", onSpinboxChange);

    let x1 = divInputX
      .append("div")
      .append("input")
      .attr("type", hasScaleTime ? "Date" : "number")
      .attr("min", hasScaleTime ? fmtX(domainX[0]) : domainX[0])
      .attr("max", hasScaleTime ? fmtX(domainX[1]) : domainX[1])
      .attr("width", "50%")
      .attr("step", ts.stepX)
      // .style("background-color", ts.backgroundColor)
      .on("change", onSpinboxChange);

    let divY = selection.append("div");

    divY.append("span").text(yLabel ? yLabel : "Y Axis:");

    let divInputY = divY.append("div");

    let domainY = overviewY.domain();

    let y0 = divInputY
      .append("div")
      .append("input")
      .attr("type", "number")
      .attr("min", domainY[0])
      .attr("max", domainY[1])
      .attr("width", "50%")
      .attr("step", ts.stepY)
      // .style("background-color", ts.backgroundColor)
      .on("change", onSpinboxChange);

    let y1 = divInputY
      .append("div")
      .append("input")
      .attr("type", "number")
      .attr("min", domainY[0])
      .attr("max", domainY[1])
      .attr("width", "50%")
      .attr("step", ts.stepY)
      // .style("background-color", ts.backgroundColor)
      .on("change", onSpinboxChange);

    brushSpinBoxes = [
      [x0, y0],
      [x1, y1],
    ];

    if (showBrushesCoordinates) {
      selection
        .insert("h3", ":first-child")
        .text("Current TimeBox Coordinates:");
      divControls.appendChild(brushesCoordinates);
    }
  }

  function generateDataSelectionDiv() {
    if (color) {
      divData.node().innerHTML = "";
      divData.append("span").text("Data groups: ");

      let divButtons = divData
        .selectAll(".groupData")
        .data(selectedGroupData)
        .join("div")
        .attr("class", "groupData");
      divButtons
        .append("button")
        .style("font-size", `${ts.brushGroupSize}px`)
        .style("stroke", "black")
        .style("margin", "2px")
        .style("margin-right", "10px")
        .style("border-width", "3px")
        .style("border", "solid black")
        .style("width", `${ts.brushGroupSize}px`)
        .style("height", `${ts.brushGroupSize}px`)
        .style("background-color", (d) => ts.colorScale(d))
        .on("click", function (event, d) {
          if (selectedGroupData.has(d)) {
            selectedGroupData.delete(d);
            d3.select(this).style("border", "solid transparent");
          } else {
            selectedGroupData.add(d);
            d3.select(this).style("border", "solid black");
          }

          onGroupDataChange();
        });
      divButtons.append("span").text((d) => d);
    }
  }

  // Filter dataSelected and dataNotSelected by enable dataGroups
  function filterDatabyDataGroups(dataSelected, dataNotSelected) {
    let dataSelectedF = new Map(dataSelected);
    let dataNotSelectedF = dataNotSelected;
    for (let d of dataSelectedF) {
      let filtered = d[1].filter((d) => selectedGroupData.has(color(d[1][0])));
      dataSelectedF.set(d[0], filtered);
    }
    dataNotSelectedF = dataNotSelectedF.filter((d) =>
      selectedGroupData.has(color(d[1][0]))
    );

    return [dataSelectedF, dataNotSelectedF];
  }

  // Called when the active dataGroups are modified.
  function onGroupDataChange() {
    onSelectionChange();
  }

  function initDetails({ overviewX, overviewY }) {
    if (ts.hasDetails) {
      // see if already exists and element and reutilize it, if not create new div
      if (!detailsElement) {
        detailsElement =
          d3.select(target).select("#details").node() ||
          d3.create("div").attr("id", "#details").node();
      }

      // TimelineDetails object
      timelineDetails = TimelineDetails({
        ts,
        detailsElement,
        detailsContainerHeight,
        detailsWidth,
        maxDetailsRecords,
        detailsHeight,
        x,
        y,
        margin: detailsMargin,
      });

      timelineDetails.setScales({ overviewX, overviewY });
      if (showDetails) divOverview.appendChild(detailsElement);
    }
  }

  // Callback that is called when the value of the spinboxes is modified.
  function onSpinboxChange(sourceEvent) {
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[sx0, sy0], [sx1, sy1]] = brushSpinBoxes;

    let domainX = overviewX.domain();

    let x0;
    let x1;
    let y0 = +sy1.node().value;
    let y1 = +sy0.node().value;

    if (hasScaleTime) {
      x0 = new Date(sx0.node().value);
      x1 = new Date(sx1.node().value);
      if (x0 >= x1) {
        if (sourceEvent.target === sx0.node()) {
          x1 = add(x0, ts.stepX);
          x1 = Math.min(x1, domainX[1]);
          sx1.node().value = fmtX(x1);
        } else {
          x0 = sub(x1, ts.stepX);
          x0 = Math.max(x0, domainX[0]);
          sx0.node().value = fmtX(x0);
        }
      }
    } else {
      x0 = +sx0.node().value;
      x1 = +sx1.node().value;

      if (x0 >= x1) {
        if (sourceEvent.target === sx0.node()) {
          x1 = x0 + ts.stepX;
          sx1.node().value = x1;
        } else {
          x0 = x1 - ts.stepX;
          sx0.node().value = x0;
        }
      }
    }

    if (y1 >= y0) {
      if (sourceEvent.target === sy0.node()) {
        y0 = y1 + ts.stepY;
        sy1.node().value = y0;
      } else {
        y1 = y0 - ts.stepY;
        sy0.node().value = y1;
      }
    }

    brushes.moveSelectedBrush([
      [x0, y0],
      [x1, y1],
    ]);
  }

  function onArrowRigth() {
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[x0, y0], [x1, y1]] = selectedBrush[1].selectionDomain;

    let maxX = overviewX.domain()[1];

    if (hasScaleTime) {
      x1 = add(x1, ts.stepX);
      if (x1 > maxX) {
        x1 = sub(x1, ts.stepX);
        let dist = intervalToDuration({ start: x1, end: maxX });
        x1 = maxX;
        x0 = add(x0, dist);
      } else {
        x0 = add(x0, ts.stepX);
      }
    } else {
      x1 += ts.stepX;
      if (x1 > maxX) {
        let dist = maxX - x1 + ts.stepX;
        x1 = maxX;
        x0 -= dist;
      } else {
        x0 += ts.stepX;
      }
    }

    brushes.moveSelectedBrush(
      [
        [x0, y0],
        [x1, y1],
      ],
      true
    );
  }

  function onArrowLeft() {
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[x0, y0], [x1, y1]] = selectedBrush[1].selectionDomain;

    let minX = overviewX.domain()[0];

    if (hasScaleTime) {
      x0 = sub(x0, ts.stepX);
      if (x0 < minX) {
        x0 = add(x0, ts.stepX);
        let dist = intervalToDuration({ start: minX, end: x0 });
        x0 = minX;
        x1 = sub(x1, dist);
      } else {
        x1 = sub(x1, ts.stepX);
      }
    } else {
      x0 -= ts.stepX;
      if (x0 < minX) {
        let dist = x0 + ts.stepX - minX;
        x0 = minX;
        x1 -= dist;
      } else {
        x1 -= ts.stepX;
      }
    }

    brushes.moveSelectedBrush(
      [
        [x0, y0],
        [x1, y1],
      ],
      true
    );
  }

  function onArrowDown() {
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[x0, y0], [x1, y1]] = selectedBrush[1].selectionDomain;

    y1 -= ts.stepY;

    let minY = overviewY.domain()[0];

    if (y1 < minY) {
      let dist = y1 + ts.stepY - minY;
      y1 = minY;
      y0 -= dist;
    } else {
      y0 -= ts.stepY;
    }
    brushes.moveSelectedBrush(
      [
        [x0, y0],
        [x1, y1],
      ],
      true
    );
  }

  function onArrowUp() {
    let selectedBrush = brushes.getSelectedBrush();
    if (selectedBrush === null) return;

    let [[x0, y0], [x1, y1]] = selectedBrush[1].selectionDomain;

    y0 += ts.stepY;

    let maxY = overviewY.domain()[1];

    if (y0 > maxY) {
      let dist = maxY - y0 + ts.stepY;
      y0 = maxY;
      y1 += dist;
    } else {
      y1 += ts.stepY;
    }

    brushes.moveSelectedBrush(
      [
        [x0, y0],
        [x1, y1],
      ],
      true
    );
  }

  // To render the overview and detailed view based on the selectedData
  function render(dataSelected, dataNotSelected, hasSelection) {
    // Prepare the medians array to print ( only the enable groups)
    let medians = [];
    let enableBrushGroups = brushes.getEnableGroups();
    enableBrushGroups.forEach((id) => {
      if (medianBrushGroups.has(id)) {
        medians.push([id, medianBrushGroups.get(id)]);
      }
    });

    // Decide which elements are painted as selected or not, depending on the enable groups.
    let mDataSelected = new Map();
    let mDataNotSelected = new Set(dataNotSelected);
    dataSelected.forEach((g, i) => {
      if (enableBrushGroups.has(i)) {
        mDataSelected.set(i, g);
      } else {
        g.forEach((d) => mDataNotSelected.add(d));
      }
    });

    // Delete the groupsNotSelected in otherTs selection
    let mTsElementSelection = [];
    if (tsElementsSelection) {
      tsElementsSelection.forEach((tsSelection) => {
        if (!tsSelection) mTsElementSelection.push(null);
        else {
          let groupsSelected = new Map();
          tsSelection.forEach((dataGroup, gId) => {
            if (enableBrushGroups.has(gId)) groupsSelected.set(gId, dataGroup);
          });
          mTsElementSelection.push(groupsSelected);
        }
      });
    }

    // Delete the notSelected elements that are selected.
    mDataSelected.forEach((d) => mDataNotSelected.delete(d));
    dataNotSelected = Array.from(mDataNotSelected);

    timelineOverview.render(
      mDataSelected,
      brushes.getBrushGroupSelected(),
      showNonSelected ? dataNotSelected : [],
      medians,
      hasSelection,
      mTsElementSelection, // print the selections made by child Elements
      positionTs,
      otherSelectionToHightlight
    );

    if (ts.hasDetails) {
      let brushGroupSelected = brushes.getBrushGroupSelected();
      window.requestAnimationFrame(() =>
        timelineDetails.render({ data: dataSelected, brushGroupSelected })
      );
      // window.requestAnimationFrame(() => renderDetailsCanvas(dataSelected));
    }
  }

  function getBrushGroupsMedians(data) {
    if (!brushes.hasSelection()) return;
    // TODO use d3.bin()
    let minX = +overviewX.domain()[0];
    let maxX = +overviewX.domain()[1];

    let binW = (maxX - minX) / ts.medianNumBins;

    // log(
    //   "getBrushGroupsMedians: number of bins",
    //   ts.medianNumBins,
    //   " binW ",
    //   binW,
    //   minX,
    //   maxX
    // );

    for (let g of data.entries()) {
      let id = g[0];

      let bins = [];
      let cx = minX;
      for (let i = 0; i < ts.medianNumBins; ++i) {
        bins.push({
          x0: cx,
          x1: cx + binW,
          data: [],
        });
        cx += binW;
      }
      for (let line of g[1]) {
        for (let point of line[1]) {
          let i = Math.floor((x(point) - minX) / binW);
          i = i > ts.medianNumBins - 1 ? i - 1 : i;
          bins[i].data.push(y(point));
        }
      }

      let median = [];
      for (let bin of bins) {
        if (bin.data.length >= ts.medianMinRecordsPerBin) {
          let x = bin.x0 + (bin.x1 - bin.x0) / 2;
          let y = ts.medianFn(bin.data);
          median.push([x, y]);
        }
      }
      medianBrushGroups.set(id, median);
    }

    log(" Bins computed", medianBrushGroups);
  }

  // Callback that is called each time the selection made by the brushes is modified.
  function onSelectionChange(
    newDataSelected = dataSelected,
    newDataNotSelected = dataNotSelected,
    hasSelection = brushes.hasSelection(),
    update = true
  ) {
    dataSelected = newDataSelected;
    dataNotSelected = newDataNotSelected;

    // Filter data with active dataGroups
    if (color) {
      [renderSelected, renderNotSelected] = filterDatabyDataGroups(
        dataSelected,
        dataNotSelected
      );
    } else {
      renderSelected = dataSelected;
      renderNotSelected = dataNotSelected;
    }

    if (tsElements) {
      ({ renderSelected, renderNotSelected } = filterByExternalSelected(
        renderSelected,
        renderNotSelected
      ));
    }

    // Compute the medians if needed
    if (showGroupMedian) {
      getBrushGroupsMedians(renderSelected);
    }

    render(renderSelected, renderNotSelected, hasSelection); // Print the filtered data by active dataGroups

    renderBrushesControls();
    triggerValueUpdate(renderSelected);
    sentSelection(renderSelected, update);
  }

  // Called every time the brushGroups changes
  function onBrushGroupsChange() {
    render(renderSelected, renderNotSelected, brushes.hasSelection());
    renderBrushesControls();
    triggerValueUpdate();
  }

  function updateStatus() {
    let status = new Map();
    for (let [id, brushGroup] of brushes.getBrushesGroup()) {
      let Gstatus = {
        id: id,
        name: brushGroup.name,
        isActive: brushGroup.isActive,
        isEnable: brushGroup.isEnable,
        brushes: brushGroup.brushes,
      };
      status.set(brushGroup.name, Gstatus);
    }
    divOverview.value.status = status;
    divOverview.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Converts the brushes map into an array
  function convertBrushMapToArray(
    map,
    { getRepresentative = (v) => v[0], groupAttributeName = "tw_group" } = {}
  ) {
    return [...map.entries()]
      .map(([group, d]) => {
        const oneRepresentativePerObject = [...d.values()].map((v) => {
          const representative = getRepresentative(v);
          representative[groupAttributeName] = group;
          return representative;
        });
        return oneRepresentativePerObject;
      })
      .flat();
  }

  // Triggers the update of the selection calls callback and dispatches input event
  function triggerValueUpdate(sel = renderSelected) {
    let value = new Map();

    for (let [id, brushGroup] of brushes.getBrushesGroup()) {
      let groupMap = new Map();
      sel.get(id).forEach((d) => groupMap.set(d[0], d[1]));
      value.set(brushGroup.name, groupMap);
    }

    divOverview.value = value;
    divOverview.value.groupsColorScale = brushesColorScale;
    divOverview.value.nonSelectedIds = dataNotSelected.map((d) => d[0]);
    divOverview.value.selectedIds = dataSelected
      .get(brushes.getBrushGroupSelected())
      .map((d) => d[0]);
    divOverview.value.selectedGroup = brushes
      .getBrushesGroup()
      .get(brushes.getBrushGroupSelected()).name;
    divOverview.value.asArray = (params) =>
      convertBrushMapToArray(value, params);
    divOverview.extent = {
      x: overviewX.domain(),
      y: overviewY.domain(),
    };
    divOverview.brushGroups = brushes.getBrushesGroup();
    updateStatus();
  }

  function sentSelection(selection, update) {
    //if (brushes.hasSelection()) {
    let eventSelection = new CustomEvent("TimeWidget", {
      detail: {
        type: eventType.changeSelection,
        data: brushes.hasSelection() ? selection : null,
      },
    });

    sentEvent(eventSelection);

    if (update) {
      let eventUpdate = new CustomEvent("TimeWidget", {
        detail: {
          type: eventType.update,
        },
      });
      sentEvent(eventUpdate);
    }

    render(renderSelected, renderNotSelected, brushes.hasSelection());
    //}
  }

  // Send a customEvent to all TimeWidgets but the sender
  function sentEvent(customEvent) {
    customEvent.detail.sourceId = positionTs;
    if (!tsElements) return;

    tsElements.forEach((otherTs, id) => {
      if (id !== positionTs) otherTs.dispatchEvent(customEvent);
    });
  }

  function onTimeWidgetEvent(event) {
    let eventData = event.detail;
    log(
      "customEvent",
      "destination",
      positionTs,
      "source",
      eventData.sourceId,
      eventData.type
    );
    switch (eventData.type) {
      case eventType.changeSelection:
        tsElementsSelection[eventData.sourceId] = eventData.data;
        break;
      case eventType.update:
        onUpdateEvent(eventData.sourceId, eventData.data);
        break;
      case eventType.addBrushGroup:
        brushes.addBrushGroup();
        break;
      case eventType.removeBrushGroup:
        brushes.removeBrushGroup(eventData.data);
        break;
      case eventType.selectBrushGroup:
        brushes.selectBrushGroup(eventData.data);
        break;
      case eventType.changeBrushGroupState:
        brushes.changeBrushGroupState(
          eventData.data.id,
          eventData.data.newState
        );
        break;
      case eventType.deselectAllBrushes:
        brushes.deselectBrush();
        break;
      case eventType.highlightSelection:
        if (eventData.data) {
          otherSelectionToHightlight = {
            positionTs: eventData.data.positionTs,
            groupId: eventData.data.groupId,
          };
        } else {
          otherSelectionToHightlight = null;
        }
        render(renderSelected, renderNotSelected, brushes.hasSelection());
        break;
      case eventType.changeNonSelected:
        showNonSelected = eventData.data.newState;
        onSelectionChange();
        break;
      default:
        log("unsupported event", eventData);
    }
  }

  function onUpdateEvent(tsId) {
    // Only update the selection of the children, the parents only repaint
    if (positionTs <= tsId) {
      render(renderSelected, renderNotSelected, brushes.hasSelection());
    } else {
      onSelectionChange(
        dataSelected,
        dataNotSelected,
        brushes.hasSelection(),
        false
      );
    }
  }

  function filterByExternalSelected(dataSelected, dataNotSelected) {
    if (!tsElementsSelection || positionTs === 0) {
      return {
        renderSelected: dataSelected,
        renderNotSelected: dataNotSelected,
      };
    }

    /*
        // compute a map that contains the data Ids selected in upper levels by brushGroups
        let flatSelections = new Map();
        tsElementsSelection.forEach((tsSelection, ix) => {
          if (positionTs > ix) {
            tsSelection.forEach((g, gId) => {
              if (!flatSelections.has(gId)) {
                flatSelections.set(gId, new Set());
              }
              g.forEach((d) => flatSelections.get(gId).add(d[0]));
            });
          }
        }); */

    let allSelected = new Set();
    let previousSelected = new Map();

    // Find the closes TS with selection made
    let lastWithSelection;
    for (let i = positionTs - 1; i >= 0; i--) {
      if (tsElementsSelection[i]) {
        lastWithSelection = i;
        break;
      }
    }
    // Filter with the last selection made.
    if (lastWithSelection !== undefined) {
      // do this because if(0) is false
      tsElementsSelection[lastWithSelection].forEach((g, gId) => {
        let selectedSet = new Set();
        g.forEach((d) => {
          selectedSet.add(d[0]);
          allSelected.add(d[0]);
        });
        previousSelected.set(gId, selectedSet);
      });

      let fDataSelected = new Map();
      dataSelected.forEach((g, id) => {
        if (previousSelected.has(id)) {
          let gFilter = g.filter((d) => previousSelected.get(id).has(d[0]));
          fDataSelected.set(id, gFilter);
        } else {
          fDataSelected.set(id, g);
        }
      });

      let fDataNotSelected = dataNotSelected.filter((d) =>
        allSelected.has(d[0])
      );
      return {
        renderSelected: fDataSelected,
        renderNotSelected: fDataNotSelected,
      };
    } else {
      return {
        renderSelected: dataSelected,
        renderNotSelected: dataNotSelected,
      };
    }
  }

  /*function brushesToDomain(brushesGroup) {
      let selectedBrush = brushes.getSelectedBrush();
      let outMap = new Map();
      for (let brushGroup of brushesGroup.entries()) {
        let innerMap = new Map();
        for (let brush of brushGroup[1].entries()) {
          if (brush[1].selection !== null) {
            let nBrush = Object.assign({}, brush[1]);

            // pixels
            let [[x0, y0], [x1, y1]] = brush[1].selection;
            nBrush.selectionPixels = [
              [x0, y0],
              [x1, y1],
            ];

            // data domain
            let [[xi0, yi0], [xi1, yi1]] = brush[1].selection.map(([x, y]) => [
              overviewX.invert(x),
              overviewY.invert(y),
            ]);
            nBrush.selection = [
              [xi0, yi0],
              [xi1, yi1],
            ];

            nBrush.isActive = !!selectedBrush && selectedBrush[0] === brush[0];

            innerMap.set(brush[0], nBrush);
          }
        }
        outMap.set(brushGroup[0], innerMap);
      }
      return outMap;
    } */

  ts.addReferenceCurves = function (curves) {
    if (!overviewX) return;
    if (!Array.isArray(curves)) {
      throw new Error("The reference curves must be an array of Objects");
    }
    let domainX = overviewX.domain();
    let domainY = overviewY.domain();

    curves.forEach((c) => {
      c.data.sort((a, b) => d3.ascending(x(a), x(b)));
      c.data = c.data.filter(
        (p) =>
          p[0] >= domainX[0] &&
          p[0] <= domainX[1] &&
          p[1] >= domainY[0] &&
          p[1] <= domainY[1]
      );
    });

    let line2 = d3
      .line()
      .defined((d) => d[1] !== undefined && d[1] !== null)
      .x((d) => overviewX(d[0]))
      .y((d) => overviewY(d[1]));

    gReferences
      .selectAll(".referenceCurve")
      .data(curves)
      .join("path")
      .attr("class", "referenceCurve")
      .attr("d", (c) => line2(c.data))
      .attr("stroke-width", (c) => c.strokeWidth || 2)
      .style("fill", "none")
      .style("stroke", (c) => c.color)
      .style("opacity", (c) => c.opacity);
  };

  // Función simple para dibujar líneas algebraicas
  ts.addAlgebraicLine = function(equation, options = {}) {
    if (!overviewX) return;
    
    const {
      color = "#ff0000",
      opacity = 0.8,
      strokeWidth = 2,
      numPoints = 100,
      xRange = null
    } = options;

    // Usar el dominio actual si no se especifica rango
    const domainX = xRange || overviewX.domain();
    const [xMin, xMax] = domainX;
    const step = (xMax - xMin) / (numPoints - 1);
    
    // Generar puntos de la función algebraica
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const xVal = xMin + i * step;
      try {
        const yVal = equation(xVal);
        if (isFinite(yVal)) {
          points.push([xVal, yVal]);
        }
      } catch (e) {
        // Ignorar puntos donde la función no está definida
        continue;
      }
    }

    if (points.length === 0) return;

    // Crear curva de referencia
    const curve = {
      data: points,
      color: color,
      opacity: opacity,
      strokeWidth: strokeWidth
    };

    // Usar el sistema existente de referencias
    ts.addReferenceCurves([curve]);
  };

  ts.updateCallback = function (_) {
    return arguments.length ? ((updateCallback = _), ts) : updateCallback;
  };

  ts.statusCallback = function (_) {
    return arguments.length ? ((statusCallback = _), ts) : statusCallback;
  };

  // Notify a parent TimeWidget the presence of a child, and calculate the total
  // TimeWidget linked and the position of each of them.
  ts.notifyParent = function (linkedTs, childs) {
    linkedTs.unshift(target);
    if (tsParent) tsElements = tsParent.notifyParent(linkedTs, childs + 1);
    else tsElements = linkedTs;

    positionTs = tsElements.length - 1 - childs;

    if (brushes) brushes.setTsPosition(positionTs);
    if (groupedData) sentSelection(renderSelected, false);

    return tsElements;
  };

  ts.data = function (_data) {
    data = _data;
    log(" Processing data: ... ", data.length);
    // Ignore null values. Shouldn't be y(d) && x(d) because y(d) can be 0
    fData = data.filter(
      (d) =>
        y(d) !== undefined &&
        y(d) !== null &&
        x(d) !== undefined &&
        x(d) !== null
    );

    let xDataType = typeof x(fData[0]);

    initDomains({ xDataType, fData });

    fData = fData.filter(
      (d) => !isNaN(overviewX(x(d))) && !isNaN(overviewY(y(d)))
    );

    groupedData = d3.groups(fData, id);

    groupedData.map((d) => [
      d[0],
      d[1].sort((a, b) => d3.ascending(x(a), x(b))),
    ]);

    ts.alphaScale.domain([0, groupedData.length]);

    // Limit the number of timelines
    if (maxTimelines) groupedData = groupedData.slice(0, maxTimelines);
    init();

    timelineOverview.setScales({
      scaleX: overviewX,
      scaleY: overviewY,
    });
    timelineOverview.data(groupedData);

    generateDataSelectionDiv();

    initDetails({ overviewX, overviewY });

    dataSelected.set(0, []);
    renderSelected = dataSelected;
    dataNotSelected = groupedData;
    renderNotSelected = dataNotSelected;

    if (_this) brushes.addFilters(_this.value.status, true);
    else if (filters) brushes.addFilters(filters, true);

    onSelectionChange();
  };

  if (tsParent) {
    ts.notifyParent([], 0);
    // Add the own selection
    tsElementsSelection[positionTs] = null;
  }

  // If we receive the data on initialization call ts.Data
  if (data && x && y && id) {
    ts.data(data);
  } else {
    overviewX = d3
      .scaleLinear()
      .range([0, width - ts.margin.right - ts.margin.left]);

    overviewY = d3
      .scaleLinear()
      .range([height - ts.margin.top - ts.margin.bottom, 0])
      .nice()
      .clamp(true);
    init();
  }

  if (referenceCurves) {
    ts.addReferenceCurves(referenceCurves);
  }

  // To allow a message from the outside to rerender
  ts.render = () => {
    // render(dataSelected, dataNotSelected);
    onSelectionChange();
  };

  // Remove possible previous event listener
  //target.removeEventListener("TimeWidget", onTimeWidgetEvent);

  // Make the ts object accessible
  divOverview.ts = ts;
  divOverview.details = detailsElement;
  divOverview.brushesCoordinates = brushesCoordinates;
  divOverview.groups = groupsElement;
  return divOverview;
}

export { TimeWidget as default };
//# sourceMappingURL=TimeWidget.esm.js.map
