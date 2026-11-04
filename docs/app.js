/**
 * Nexus Console — Editorial Paper Edition Interactive Script
 * Powers the broadsheet layout: OS tab switching, live desktop mockup,
 * port killer, service controller, and ink copy feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  initOsTabs();
  initPreviewTabs();
  initMockServices();
  initMockPorts();
  initMockDoctor();
  initMockTerminal();
  initCopyButtons();
});

// -------------------------------------------------------------
// OS Tabs Switcher (Linux, macOS, Windows)
// -------------------------------------------------------------
function initOsTabs() {
  const osButtons = document.querySelectorAll('[data-os-target]');
  const osSections = document.querySelectorAll('[data-os-content]');
  const detectedLabel = document.getElementById('detected-os-badge');

  // Detect user platform
  const ua = navigator.userAgent.toLowerCase();
  let defaultOs = 'linux'; // Default to Linux per user's primary focus

  if (ua.includes('mac') || ua.includes('darwin')) {
    defaultOs = 'mac';
  } else if (ua.includes('win')) {
    defaultOs = 'windows';
  } else if (ua.includes('linux')) {
    defaultOs = 'linux';
  }

  if (detectedLabel) {
    const osNames = { linux: 'Linux (Fedora/Debian)', mac: 'macOS', windows: 'Windows' };
    detectedLabel.textContent = `Auto-detected: ${osNames[defaultOs]}`;
  }

  function switchOs(targetOs) {
    osButtons.forEach((btn) => {
      const isTarget = btn.getAttribute('data-os-target') === targetOs;
      btn.classList.toggle('active', isTarget);
      if (isTarget) {
        btn.classList.add('bg-[#141413]', 'text-white');
        btn.classList.remove('bg-white', 'text-ink');
      } else {
        btn.classList.remove('bg-[#141413]', 'text-white');
        btn.classList.add('bg-white', 'text-ink');
      }
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    osSections.forEach((sec) => {
      const isTarget = sec.getAttribute('data-os-content') === targetOs;
      sec.classList.toggle('hidden', !isTarget);
      if (isTarget) {
        sec.classList.remove('hidden');
      }
    });
  }

  osButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-os-target');
      switchOs(target);
    });
  });

  // Activate detected or default OS
  switchOs(defaultOs);
}

// -------------------------------------------------------------
// Interactive Desktop App Mockup Tabs
// -------------------------------------------------------------
function initPreviewTabs() {
  const tabButtons = document.querySelectorAll('[data-preview-tab]');
  const previewPanes = document.querySelectorAll('[data-pane]');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetPane = btn.getAttribute('data-preview-tab');

      tabButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('bg-[#141413]', isActive);
        b.classList.toggle('text-white', isActive);
        b.classList.toggle('bg-white', !isActive);
        b.classList.toggle('text-ink', !isActive);
      });

      previewPanes.forEach((pane) => {
        const matches = pane.getAttribute('data-pane') === targetPane;
        pane.classList.toggle('active', matches);
        pane.classList.toggle('hidden', !matches);
      });
    });
  });
}

// -------------------------------------------------------------
// Mock Services Interaction
// -------------------------------------------------------------
function initMockServices() {
  const serviceRows = document.querySelectorAll('[data-mock-service]');

  serviceRows.forEach((row) => {
    const actionBtn = row.querySelector('.service-action-btn');
    const statusDot = row.querySelector('.service-dot');
    const statusText = row.querySelector('.service-status-text');

    if (!actionBtn || !statusDot || !statusText) return;

    actionBtn.addEventListener('click', () => {
      const isRunning = actionBtn.getAttribute('data-state') === 'running';

      if (isRunning) {
        // Stop service
        actionBtn.setAttribute('data-state', 'stopped');
        actionBtn.textContent = 'Start';
        actionBtn.className =
          'service-action-btn px-2.5 py-1 text-xs rounded border border-ink bg-white text-ink hover:bg-[#f2eee3] transition font-bold shadow-[1.5px_1.5px_0px_#141413]';
        statusDot.className = 'service-dot w-2.5 h-2.5 rounded-full bg-gray-400 border border-ink';
        statusText.textContent = 'Stopped';
        statusText.className = 'service-status-text text-xs text-ink-subtle font-mono';
        showToast(`Stopped ${row.getAttribute('data-mock-service')}`);
      } else {
        // Start service
        actionBtn.setAttribute('data-state', 'running');
        actionBtn.textContent = 'Stop';
        actionBtn.className =
          'service-action-btn px-2.5 py-1 text-xs rounded border border-ink bg-white text-ink hover:bg-[#f2eee3] transition font-bold shadow-[1.5px_1.5px_0px_#141413]';
        statusDot.className = 'service-dot w-2.5 h-2.5 rounded-full bg-[#166534] status-dot-pulse';
        statusText.textContent = 'Running (1s)';
        statusText.className = 'service-status-text text-xs text-[#166534] font-mono font-bold';
        showToast(`Started ${row.getAttribute('data-mock-service')}`);
      }
      updateActiveServiceCount();
    });
  });

  function updateActiveServiceCount() {
    const activeCount = document.querySelectorAll(
      '[data-mock-service] [data-state="running"]',
    ).length;
    const badge = document.getElementById('mock-services-badge');
    if (badge) badge.textContent = activeCount;
  }
}

// -------------------------------------------------------------
// Mock Ports Killer Interaction
// -------------------------------------------------------------
function initMockPorts() {
  const killButtons = document.querySelectorAll('.kill-port-btn');
  const portCounter = document.getElementById('mock-port-count');
  const resetBtn = document.getElementById('mock-reset-ports-btn');

  let activePortCount = killButtons.length;

  killButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      const portName = row.getAttribute('data-port-label') || 'Process';
      const pid = row.getAttribute('data-pid') || '';

      btn.disabled = true;
      btn.innerHTML = `Killing...`;

      setTimeout(() => {
        row.classList.add('row-killed');
        activePortCount = Math.max(0, activePortCount - 1);
        if (portCounter) {
          portCounter.textContent = `${activePortCount} active ports`;
        }
        showToast(`Terminated PID ${pid} (${portName})`);
      }, 250);
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.querySelectorAll('#mock-ports-table tbody tr').forEach((row) => {
        row.classList.remove('row-killed');
        row.style.display = '';
        const btn = row.querySelector('.kill-port-btn');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Kill PID';
        }
      });
      activePortCount = 4;
      if (portCounter) portCounter.textContent = '4 active ports';
      showToast('Reset sample ports table');
    });
  }
}

// -------------------------------------------------------------
// Mock Doctor Diagnostics
// -------------------------------------------------------------
function initMockDoctor() {
  const scanBtn = document.getElementById('mock-doctor-scan-btn');
  const cleanBtn = document.getElementById('mock-doctor-clean-btn');
  const progressBar = document.getElementById('mock-doctor-progress');
  const resultSummary = document.getElementById('mock-doctor-summary');

  if (scanBtn && progressBar) {
    scanBtn.addEventListener('click', () => {
      scanBtn.disabled = true;
      scanBtn.textContent = 'Probing storage...';
      progressBar.style.width = '0%';
      progressBar.parentElement.classList.remove('hidden');

      let step = 0;
      const interval = setInterval(() => {
        step += 25;
        progressBar.style.width = `${step}%`;
        if (step >= 100) {
          clearInterval(interval);
          scanBtn.disabled = false;
          scanBtn.textContent = 'Re-scan System';
          showToast('Health diagnostics complete: 0 issues, 1.4 GB reclaimable.');
          if (resultSummary) {
            resultSummary.textContent = 'System Healthy • 1.4 GB reclaimable';
            resultSummary.className = 'text-xs text-[#166534] font-mono font-bold';
          }
        }
      }, 140);
    });
  }

  if (cleanBtn) {
    cleanBtn.addEventListener('click', () => {
      cleanBtn.disabled = true;
      cleanBtn.innerHTML = `<span>Purging...</span>`;
      setTimeout(() => {
        cleanBtn.textContent = 'Cleaned!';
        cleanBtn.classList.remove('btn-ink-primary');
        cleanBtn.classList.add('bg-[#166534]', 'text-white');
        showToast('Cleaned 1.4 GB dev cache (VSCode & Claude chat history)');
        if (resultSummary) {
          resultSummary.textContent = 'All caches clean • 0 B reclaimable';
        }
      }, 500);
    });
  }
}

// -------------------------------------------------------------
// Mock Terminal Interactive Prompt
// -------------------------------------------------------------
function initMockTerminal() {
  const termInput = document.getElementById('mock-terminal-input');
  const termOutput = document.getElementById('mock-terminal-output');
  const pillCommands = document.querySelectorAll('[data-term-cmd]');

  if (!termInput || !termOutput) return;

  const COMMANDS = {
    help: 'Available commands: help, status, brew, rpm, ports, doctor, clear',
    status:
      'Nexus Console v0.1.0 [Linux x86_64]\nCore: Tauri 2.11 + Rust 1.80\nServices: 3 running, 1 stopped\nDoctor: Healthy (0 errors)\nTelemetry: None (100% offline broadsheet)',
    rpm: 'RPM Package: Nexus Console-0.1.0-1.x86_64.rpm\nInstall: sudo dnf install ./Nexus\\ Console-0.1.0-1.x86_64.rpm\nSize: 8.9 MB | SHA256: f2b9690e80f5b34e98c1...',
    ports:
      'Listening Ports:\n  :3000   node (PID 48129)\n  :5432   postgres (PID 1092)\n  :6379   redis-server (PID 8312)\n  :8080   caddy (PID 9411)',
    doctor:
      'System Diagnostics:\n  ✓ Linux Kernel 6.11+ OK\n  ✓ WebKit2GTK 4.1 detected\n  ✓ DNF package cache optimized\n  ℹ 1.4 GB VSCode workspace logs purgeable',
    brew: 'Homebrew / Linuxbrew:\n  Formulae: 48 installed (2 updates available)\n  Services: postgresql@16 (started), redis (started), caddy (started)',
  };

  function executeCommand(rawCmd) {
    const cmd = rawCmd.trim().toLowerCase();
    const promptLine = document.createElement('div');
    promptLine.className = 'text-[#f4f4f0] flex gap-2 font-mono text-xs';
    promptLine.innerHTML = `<span class="text-[#f5c544]">➜</span> <span class="text-gray-400">~</span> <span class="text-white">${escapeHtml(rawCmd)}</span>`;
    termOutput.appendChild(promptLine);

    if (cmd === 'clear') {
      termOutput.innerHTML = '';
      return;
    }

    const response =
      COMMANDS[cmd] || `nexus: command not found: ${escapeHtml(cmd)}. Type 'help' for commands.`;
    const respLine = document.createElement('div');
    respLine.className = 'text-gray-300 font-mono text-xs whitespace-pre-wrap pl-4 pb-2';
    respLine.textContent = response;
    termOutput.appendChild(respLine);

    termOutput.scrollTop = termOutput.scrollHeight;
  }

  termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = termInput.value.trim();
      if (val) {
        executeCommand(val);
        termInput.value = '';
      }
    }
  });

  pillCommands.forEach((pill) => {
    pill.addEventListener('click', () => {
      const cmd = pill.getAttribute('data-term-cmd');
      executeCommand(cmd);
    });
  });
}

// -------------------------------------------------------------
// Copy to Clipboard with Animated Visual Feedback
// -------------------------------------------------------------
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('[data-copy-target]');

  copyButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-copy-target');
      let textToCopy = '';

      if (targetId) {
        const targetEl = document.getElementById(targetId);
        textToCopy = targetEl ? (targetEl.innerText || targetEl.textContent).trim() : '';
      } else {
        textToCopy = btn.getAttribute('data-copy-text') || '';
      }

      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      const originalHtml = btn.innerHTML;
      btn.innerHTML = `
        <span class="text-[#166534] font-mono text-xs font-bold">✓ Copied</span>
      `;

      showToast(
        `Copied to clipboard: "${textToCopy.slice(0, 32)}${textToCopy.length > 32 ? '...' : ''}"`,
      );

      setTimeout(() => {
        btn.innerHTML = originalHtml;
      }, 2000);
    });
  });
}

// -------------------------------------------------------------
// Toast Notification System
// -------------------------------------------------------------
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className =
      'fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded border-2 border-ink bg-white text-ink text-xs font-mono shadow-[4px_4px_0px_#141413] transition-all duration-150 opacity-0 translate-y-3 pointer-events-none';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <span class="w-2.5 h-2.5 rounded-full bg-[#f5c544] border border-ink"></span>
    <span class="font-bold">${escapeHtml(message)}</span>
  `;

  toast.classList.remove('opacity-0', 'translate-y-3', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none');
  }, 2600);
}

function escapeHtml(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[tag] || tag,
  );
}
