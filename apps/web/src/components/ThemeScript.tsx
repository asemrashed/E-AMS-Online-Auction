// Runs before hydration. Default is device (system) until the user picks light/dark.
export function ThemeScript() {
  const code = `
    (function() {
      try {
        var stored = localStorage.getItem('eams_theme');
        var mode = stored === 'light' || stored === 'dark' || stored === 'device' ? stored : 'device';
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var isDark = mode === 'dark' || (mode === 'device' && prefersDark);
        document.documentElement.classList.toggle('dark', isDark);
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}