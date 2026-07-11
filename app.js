const year = new Date().getFullYear();
const calendarContainer = d3.select('#calendar');
const eventsList = d3.select('#events-list');

const locationMeta = {
  "Los Angeles": { color: '#4f46e5', shape: 'circle' },
  "Vermont": { color: '#f59e0b', shape: 'square' },
  "Northern California": { color: '#10b981', shape: 'triangle' },
  London: { color: '#ec4899', shape: 'diamond' },
  Seattle: { color: '#0ea5e9', shape: 'star' }
};

const symbolTypes = {
  circle: d3.symbolCircle,
  square: d3.symbolSquare,
  triangle: d3.symbolTriangle,
  diamond: d3.symbolDiamond,
  star: d3.symbolStar
};

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const cellSize = 14;
const gap = 3;
const margin = { top: 32, right: 12, bottom: 12, left: 30 };

function formatDate(date) {
  return d3.timeFormat('%b %-d, %Y')(date);
}

function highlightEvent(eventData) {
  d3.selectAll('.calendar-marker').classed('active', false);
  d3.selectAll('.event-item').classed('active', false);

  if (!eventData) return;

  const key = d3.timeFormat('%Y-%m-%d')(eventData.date);
  d3.selectAll(`.calendar-marker[data-key="${key}"]`).classed('active', true);
  d3.selectAll(`.event-item[data-key="${key}"]`).classed('active', true);
}

function drawLegend() {
  const legend = d3.select('#legend');
  const entries = Object.entries(locationMeta);

  legend
    .selectAll('div')
    .data(entries)
    .join('div')
    .attr('class', 'legend-item')
    .each(function ([location, meta]) {
      const node = d3.select(this);
      const shape = d3.symbol().type(symbolTypes[meta.shape] || d3.symbolCircle).size(120)();
      node.append('svg').attr('width', 16).attr('height', 16).append('path').attr('d', shape).attr('fill', meta.color);
      node.append('span').text(location);
    });
}

d3.csv('events.csv').then((rows) => {
  const events = rows
    .map((row) => ({
      ...row,
      date: d3.timeParse('%Y-%m-%d')(row.date),
      location: row.location.trim(),
      name: row.name.trim(),
      category: row.category.trim()
    }))
    .filter((event) => event.date && event.date.getFullYear() === year);

  const eventsByDate = d3.group(events, (event) => d3.timeFormat('%Y-%m-%d')(event.date));
  const sortedEvents = [...events].sort((a, b) => a.date - b.date);
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const startOfWeek = d3.timeSunday.floor(startDate);
  const endOfWeek = d3.timeSunday.ceil(endDate);
  const weeks = d3.timeWeeks(startOfWeek, d3.timeSunday.offset(endOfWeek, 7));

  const width = margin.left + 7 * (cellSize + gap) + 12;
  const height = margin.top + weeks.length * (cellSize + gap) + 20;

  const svg = calendarContainer.append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);

  eventsList
    .selectAll('li')
    .data(sortedEvents)
    .join('li')
    .attr('class', 'event-item')
    .attr('data-key', (event) => d3.timeFormat('%Y-%m-%d')(event.date))
    .on('mouseenter', (_event, d) => highlightEvent(d))
    .on('mouseleave', () => highlightEvent(null))
    .on('focus', (_event, d) => highlightEvent(d))
    .on('blur', () => highlightEvent(null))
    .html('')
    .each(function (event) {
      const item = d3.select(this);
      item.append('div').attr('class', 'event-name').text(event.name);
      item.append('div').attr('class', 'event-meta').html(`<span>${event.location}</span><span>${event.category}</span>`);
      item.append('div').attr('class', 'event-date').text(formatDate(event.date));
    });

  svg
    .append('text')
    .attr('x', margin.left)
    .attr('y', 20)
    .attr('class', 'day-label')
    .text(`${year} Event Calendar`);

  dayLabels.forEach((label, dayIndex) => {
    svg
      .append('text')
      .attr('x', margin.left + dayIndex * (cellSize + gap) + 8)
      .attr('y', margin.top - 10)
      .attr('text-anchor', 'middle')
      .attr('class', 'day-label')
      .text(label);
  });

  weeks.forEach((weekStart, weekIndex) => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = d3.timeDay.offset(weekStart, dayIndex);
      const inYear = day >= startDate && day <= endDate;
      const key = d3.timeFormat('%Y-%m-%d')(day);
      const dayEvents = eventsByDate.get(key) || [];
      const x = margin.left + dayIndex * (cellSize + gap);
      const y = margin.top + weekIndex * (cellSize + gap);

      svg
        .append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('class', 'day-cell')
        .attr('fill', inYear && dayEvents.length ? d3.color(locationMeta[dayEvents[0].location]?.color || '#cbd5e1').copy({ opacity: 0.18 }).formatRgb() : '#ffffff')
        .attr('stroke', inYear && dayEvents.length ? '#cbd5e1' : '#f1f5f9');

      if (inYear) {
        svg
          .append('text')
          .attr('x', x + 7)
          .attr('y', y + 10)
          .attr('class', 'day-number')
          .attr('text-anchor', 'middle')
          .text(day.getDate());
      }

      dayEvents.forEach((event, eventIndex) => {
        const meta = locationMeta[event.location] || { color: '#64748b', shape: 'circle' };
        const symbol = d3.symbol().type(symbolTypes[meta.shape] || d3.symbolCircle).size(90)();
        const offsetX = eventIndex % 2 === 0 ? -2 : 2;
        const offsetY = eventIndex < 2 ? -2 : 2;

        svg
          .append('path')
          .attr('d', symbol)
          .attr('class', 'calendar-marker')
          .attr('data-key', d3.timeFormat('%Y-%m-%d')(event.date))
          .attr('transform', `translate(${x + cellSize / 2 + offsetX}, ${y + cellSize / 2 + offsetY})`)
          .attr('fill', meta.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.7)
          .style('cursor', 'pointer')
          .on('mouseenter', () => highlightEvent(event))
          .on('mousemove', () => highlightEvent(event))
          .on('mouseleave', () => highlightEvent(null));
      });
    }
  });

  drawLegend();
}).catch((error) => {
  calendarContainer.html('<p>Unable to load the event calendar data.</p>');
  console.error(error);
});
