import { formatDistanceToNowStrict } from 'date-fns';

/**
 * A function to format a timestamp into a human readable string like "xxx minutes ago"
 *
 * @param {number} timestamp The timestamp to be formatted
 * @returns {string} The formatted timestamp as a string
 */
export default function formatTimestamp(timestamp) {
  const distance = formatDistanceToNowStrict(timestamp, { addSuffix: true });
  if (distance !== '0 seconds ago') return distance;
  return 'Just now';
}
