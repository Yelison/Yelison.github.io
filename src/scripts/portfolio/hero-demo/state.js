/** State shared by the frontend and backend halves of the hero demo. */
export const heroDemo = {
  /** 'frontend' types the card files; 'backend' types the API endpoint. */
  mode: 'frontend',
  /** Typing starts one second after load so the page can settle first. */
  ready: false,
  /** False while the hero is scrolled out of view: typing waits there, like in a hidden tab. */
  onScreen: true,
  /** Timestamps (performance.now) before which each mode waits. */
  codeDue: 0,
  apiDue: 0,
};
