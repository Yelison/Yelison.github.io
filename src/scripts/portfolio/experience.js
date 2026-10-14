import jobs from '../../../content/experience.json';
import { t } from './i18n.js';

const list = (items) => items.map((item) => `<li>${item}</li>`).join('');

const companyLink = (job, language) =>
  job.url
    ? `<a class="company-link" href="${job.url}" rel="noopener noreferrer" target="_blank" aria-label="${t('visitCompany', { name: job.company }, language)}">${job.site} <span aria-hidden="true">↗</span></a>`
    : '';

// Only the jobs with `details` open to show what was done there.
const rowMarkup = (job, language) =>
  job.details
    ? `<article class="timeline-row reveal"><div class="timeline-date">${job.date[language]}</div><details class="job-details"><summary><h3>${job.company}</h3><span class="role">${job.role[language]}</span><span class="timeline-description">${job.description[language]}</span></summary><div class="case-content job-content"><ul class="job-list">${list(job.details[language])}</ul></div></details>${companyLink(job, language)}</article>`
    : `<article class="timeline-row reveal"><div class="timeline-date">${job.date[language]}</div><div><h3>${job.company}</h3><p class="role">${job.role[language]}</p></div><p class="timeline-description">${job.description[language]}</p>${companyLink(job, language)}</article>`;

/** Renders the career timeline the first time, then only swaps its text. */
export function renderTimeline(language) {
  const timeline = document.getElementById('timeline');
  if (!timeline.children.length) {
    timeline.innerHTML = jobs.map((job) => rowMarkup(job, language)).join('');
    return;
  }
  jobs.forEach((job, index) => {
    const row = timeline.children[index];
    row.querySelector('.timeline-date').textContent = job.date[language];
    row.querySelector('.role').textContent = job.role[language];
    row.querySelector('.timeline-description').textContent = job.description[language];
    if (job.details) row.querySelector('.job-list').innerHTML = list(job.details[language]);
    row
      .querySelector('.company-link')
      ?.setAttribute('aria-label', t('visitCompany', { name: job.company }, language));
  });
}
