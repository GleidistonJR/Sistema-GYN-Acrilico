// Keep send/echo ordering; interactive work overtakes historical imports.
export function criarFilaPrioritaria() {
  const queues = [[], [], []];
  let running = false;
  let burst = 0;
  const waiters = [];
  async function run() {
    if (running) return;
    running = true;
    while (queues.some(q => q.length)) {
      const priority = queues[0].length && (burst < 4 || !queues[1].length) ? 0 : queues[1].length ? 1 : queues[0].length ? 0 : 2;
      burst = priority === 0 ? burst + 1 : 0;
      const job = queues[priority].shift();
      try { job.resolve(await job.operation()); } catch (error) { job.reject(error); }
    }
    running = false;
    for (const resolve of waiters.splice(0)) resolve();
  }
  return {
    enqueue(operation, priority = 1) {
      const promise = new Promise((resolve, reject) => queues[priority].push({ operation, resolve, reject }));
      void run(); return promise;
    },
    drain() { return running ? new Promise(resolve => waiters.push(resolve)) : Promise.resolve(); },
  };
}
