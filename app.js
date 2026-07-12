const year = new Date().getFullYear();
const calendarContainer = d3.select('#calendar');
const eventsList = d3.select('#events-list');
const connectorLayer = d3
  .select('body')
  .append('svg')
  .attr('class', 'connector-layer')
  .attr('width', '100%')
  .attr('height', '100%');
const connectorLine = connectorLayer.append('line').attr('class', 'connector-line');

const locationMeta = {
  "Los Angeles": { color: '#4f46e5' },
  "Vermont": { color: '#f59e0b' },
  "Northern California": { color: '#10b981' },
  "San Francisco": { color: '#ec4899' },
  "Seattle": { color: '#0ea5e9' },
  "Detroit": { color: '#f97316' },
  "Oakland": { color: '#7d5cf6' },
  "New Orleans": { color: '#8b5cf6' },
  "Boston": { color: '#14b8a6' },
  "Washington DC": { color: '#ef4444' },
};

const categoryShapeMap = {
  'dj set': 'circle',
  'audio engineer': 'square',
  'shame engine live set': 'triangle',
  'shame engine (practice)': 'diamond',
  'dnb b2b w/ octo octa': 'star',
  'soundsystem designer': 'cross',
};

const symbolTypes = {
  circle: d3.symbolCircle,
  square: d3.symbolSquare,
  triangle: d3.symbolTriangle,
  diamond: d3.symbolDiamond,
  star: d3.symbolStar,
    cross: d3.symbolCross,
    pentagon: d3.symbolWye,

};

const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const cellSize = 20;
const gap = 3;
const margin = { top: 32, right: 12, bottom: 12, left: 30 };

function monthCellFill(monthIndex) {
  return d3.interpolateHcl('#81f194', '#6aa8f8')(monthIndex / 11);
}

function formatDate(date) {
  return d3.timeFormat('%b %-d, %Y')(date);
}

function getCategoryShape(category) {
  const normalized = (category || '').trim().toLowerCase();
  return categoryShapeMap[normalized] || 'circle';
}

function updateConnector(eventData) {
  if (!eventData) {
    connectorLine.classed('active', false);
    return;
  }

  const key = d3.timeFormat('%Y-%m-%d')(eventData.date);
  const marker = d3.select(`.calendar-marker[data-key="${key}"]`);
  const row = d3.select(`.event-row[data-key="${key}"]`);

  marker.classed('active', true);
  row.classed('active', true);

  if (marker.size() && row.size()) {
    const markerRect = marker.node().getBoundingClientRect();
    const rowRect = row.node().getBoundingClientRect();
    const monthIndex = eventData.date.getMonth();
    const connectorColor = monthCellFill(monthIndex);

    connectorLine
      .classed('active', true)
      .attr('x1', markerRect.left + markerRect.width / 2)
      .attr('y1', markerRect.top + markerRect.height / 2)
      .attr('x2', rowRect.left - 8)
      .attr('y2', rowRect.top + rowRect.height / 2)
      .attr('stroke', connectorColor);

    row.style('background-color', d3.color(connectorColor).copy({ opacity: 0.6 }).formatRgb());
  }
}

function highlightEvent(eventData) {
  d3.selectAll('.calendar-marker').classed('active', false);
  d3.selectAll('.event-row').classed('active', false).style('background-color', null);
  updateConnector(eventData);
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
      category: row.category.trim(),
      link: row.link ? row.link.trim() : ''
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
    .selectAll('tr')
    .data(sortedEvents)
    .join('tr')
    .attr('class', 'event-row')
    .attr('data-key', (event) => d3.timeFormat('%Y-%m-%d')(event.date))
    .on('mouseenter', (_event, d) => highlightEvent(d))
    .on('mouseleave', () => highlightEvent(null))
    .on('focus', (_event, d) => highlightEvent(d))
    .on('blur', () => highlightEvent(null))
    .html('')
    .each(function (event) {
      const row = d3.select(this);
      row.append('td').attr('class', 'event-date').text(formatDate(event.date));
      row.append('td').attr('class', 'event-name').text(event.name);
      row.append('td').attr('class', 'event-location').text(event.location);
      row.append('td').attr('class', 'event-category').text(event.category);
      const linkCell = row.append('td').attr('class', 'event-link');
      if (event.link) {
        linkCell.append('a').attr('href', event.link).attr('target', '_blank').attr('rel', 'noopener noreferrer').text('Open');
      } else {
        linkCell.text('—');
      }
    });

  svg
    .append('text')
    .attr('x', margin.left)
    .attr('y', -20)
    .attr('class', 'day-label')
    .text(`${year} Event Calendar`);

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthStart = new Date(year, monthIndex, 1);
    const firstWeek = d3.timeSunday.floor(monthStart);
    const monthWeekIndex = Math.floor((monthStart - startOfWeek) / (7 * 24 * 60 * 60 * 1000));
    const labelY = margin.top + monthWeekIndex * (cellSize + gap) + cellSize / 2 + 40 ;

    svg
      .append('text')
      .attr('x', 8)
      .attr('y', labelY)
      .attr('class', 'month-label')
      .attr('transform', `rotate(-90, 8, ${labelY})`)
      .attr('fill', monthCellFill(monthIndex))
      .text(d3.timeFormat('%b')(monthStart).toUpperCase());
  }

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
        .attr('fill', inYear ? monthCellFill(day.getMonth()) : '#ffffff')
        .attr('stroke', inYear ? '#cbd5e1' : '#f1f5f9');

      if (inYear) {
        svg
          .append('text')
          .attr('x', x + cellSize / 2)
          .attr('y', y + cellSize / 2 + 4)
          .attr('class', 'day-number')
          .attr('text-anchor', 'middle')
          .text(day.getDate());
      }

      dayEvents.forEach((event, eventIndex) => {
        const meta = locationMeta[event.location] || { color: '#64748b' };
        const shape = getCategoryShape(event.category);
        const symbol = d3.symbol().type(symbolTypes[shape] || d3.symbolCircle).size(90)();
        const offsetX = eventIndex % 2 === 0 ? -2 : 2;
        const offsetY = eventIndex < 2 ? -2 : 2;

        svg
          .append('path')
          .attr('d', symbol)
          .attr('class', 'calendar-marker')
          .attr('data-key', d3.timeFormat('%Y-%m-%d')(event.date))
          .attr('transform', `translate(${x + cellSize / 2 + offsetX + 2}, ${y + cellSize / 2 + offsetY+2})`)
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

  window.addEventListener('scroll', () => {
    const activeRow = d3.select('.event-row.active');
    if (!activeRow.empty()) {
      const key = activeRow.attr('data-key');
      const eventData = events.find((entry) => d3.timeFormat('%Y-%m-%d')(entry.date) === key);
      if (eventData) {
        updateConnector(eventData);
      }
    }
  });

  drawLegend();
}).catch((error) => {
  calendarContainer.html('<p>Unable to load the event calendar data.</p>');
  console.error(error);
});
