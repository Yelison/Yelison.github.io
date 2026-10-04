import jobs from '../../../content/experience.json';

/** Renders the career timeline the first time, then only swaps its text. */
export function renderTimeline(language) {
  const timeline = document.getElementById('timeline');
  if (!timeline.children.length) {
    timeline.innerHTML = jobs
      .map(
        (job) =>
          `<article class="timeline-row reveal"><div class="timeline-date">${job.date[language]}</div><div><h3>${job.company}</h3><p class="role">${job.role[language]}</p></div><p class="timeline-description">${job.description[language]}</p></article>`,
      )
      .join('');
    return;
  }
  jobs.forEach((job, index) => {
    const row = timeline.children[index];
    row.querySelector('.timeline-date').textContent = job.date[language];
    row.querySelector('.role').textContent = job.role[language];
    row.querySelector('.timeline-description').textContent = job.description[language];
  });
}
