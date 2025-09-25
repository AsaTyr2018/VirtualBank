document.addEventListener('DOMContentLoaded', () => {
  const toggleButtons = document.querySelectorAll('[data-auth-toggle]');
  const panels = document.querySelectorAll('[data-auth-panel]');

  toggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-auth-toggle');

      toggleButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
      panels.forEach((panel) => {
        panel.classList.toggle('active', panel.getAttribute('data-auth-panel') === target);
      });
    });
  });
});
