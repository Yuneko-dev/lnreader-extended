export const formatReadingTime = (totalSeconds: number): string => {
  if (totalSeconds < 60) {
    return '< 1m';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
