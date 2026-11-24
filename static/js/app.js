/**
 * SmartSchedule PWA 🌿 — Pastel Mint Multitasking Schedule, Daily Working Hours & Live Deadline Countdown HUD
 * Tech Stack: Vanilla JavaScript + FullCalendar v6 + FastAPI REST API
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================================================
  // 1. APPLICATION STATE
  // ==========================================================================
  const state = {
    categories: [],
    events: [],         // Events trong khung nhìn lịch hiện tại
    allTodoEvents: [],  // Toàn bộ công việc cần làm để hiển thị trên Khung Nhắc Việc Mặc Định
    selectedCategoryId: null,
    selectedStatus: "",
    searchQuery: "",
    calendar: null,
    wasMobile: window.innerWidth < 768,
    pendingConflictAction: null,
    deferredInstallPrompt: null,
    pendingFiles: [],
    currentEditingEvent: null,
    hudMinimized: false,
    pipWindow: null,
    notifiedKeys: new Set(),
  };

  // ==========================================================================
  // 2. DOM ELEMENTS
  // ==========================================================================
  const el = {
    calendarEl: document.getElementById("calendar"),
    calendarTitle: document.getElementById("calendar-title"),
    headerLiveClock: document.getElementById("header-live-clock"),
    btnToday: document.getElementById("btn-today"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    viewBtns: document.querySelectorAll(".view-btn"),

    // Search
    searchInput: document.getElementById("search-input"),
    mobileSearchInput: document.getElementById("mobile-search-input"),
    btnClearSearch: document.getElementById("btn-clear-search"),

    // Sidebar & Mobile Drawer
    sidebar: document.getElementById("app-sidebar"),
    sidebarBackdrop: document.getElementById("sidebar-backdrop"),
    btnToggleSidebar: document.getElementById("btn-toggle-sidebar"),
    btnCloseSidebar: document.getElementById("btn-close-sidebar"),
    sidebarCategoryList: document.getElementById("sidebar-category-list"),
    mobileCategoryChips: document.getElementById("mobile-category-chips"),
    statusFilterBtns: document.querySelectorAll(".status-filter-btn"),
    sidebarUpcomingList: document.getElementById("sidebar-upcoming-list"),
    upcomingCountBadge: document.getElementById("upcoming-count-badge"),

    // Stats & Mascot
    mascotMoodIcon: document.getElementById("mascot-mood-icon"),
    mascotCheerText: document.getElementById("mascot-cheer-text"),
    statTotal: document.getElementById("stat-total"),
    statPending: document.getElementById("stat-pending"),
    statCompleted: document.getElementById("stat-completed"),
    statPercent: document.getElementById("stat-percent"),
    statProgressBar: document.getElementById("stat-progress-bar"),

    // Desktop Floating Task Notification & Countdown HUD
    btnToggleHud: document.getElementById("btn-toggle-hud"),
    hudBadgeCount: document.getElementById("hud-badge-count"),
    desktopTaskHud: document.getElementById("desktop-task-hud"),
    hudDragHandle: document.getElementById("hud-drag-handle"),
    hudSubtitle: document.getElementById("hud-subtitle"),
    btnEnableDesktopNotify: document.getElementById("btn-enable-desktop-notify"),
    btnPipHud: document.getElementById("btn-pip-hud"),
    btnMinimizeHud: document.getElementById("btn-minimize-hud"),
    hudBody: document.getElementById("hud-body"),
    hudFocusBox: document.getElementById("hud-focus-box"),
    hudPendingCount: document.getElementById("hud-pending-count"),
    hudTaskList: document.getElementById("hud-task-list"),
    btnHudQuickAdd: document.getElementById("btn-hud-quick-add"),

    // Event Modal & Daily Working Time Controls
    btnAddEvent: document.getElementById("btn-add-event"),
    fabAddEvent: document.getElementById("fab-add-event"),
    eventModal: document.getElementById("event-modal"),
    eventModalTitle: document.getElementById("event-modal-title"),
    modalCategoryDot: document.getElementById("modal-category-dot"),
    modalCountdownBanner: document.getElementById("modal-countdown-banner"),
    modalCountdownLabel: document.getElementById("modal-countdown-label"),
    modalCountdownTimer: document.getElementById("modal-countdown-timer"),
    btnCloseEventModal: document.getElementById("btn-close-event-modal"),
    btnCancelEvent: document.getElementById("btn-cancel-event"),
    eventForm: document.getElementById("event-form"),
    inputEventId: document.getElementById("event-id"),
    inputRecurrenceGroupId: document.getElementById("event-recurrence-group-id"),
    inputTitle: document.getElementById("event-title"),
    inputStartDate: document.getElementById("event-start-date"),
    inputEndDate: document.getElementById("event-end-date"),
    inputDailyStartTime: document.getElementById("event-daily-start-time"),
    inputDailyEndTime: document.getElementById("event-daily-end-time"),
    inputDailyHours: document.getElementById("event-daily-hours-input"),
    dailyDurationSummary: document.getElementById("daily-duration-summary"),
    daysSpanChips: document.querySelectorAll(".days-span-chip"),
    durationChips: document.querySelectorAll(".duration-chip"),
    shiftChips: document.querySelectorAll(".shift-chip"),
    inputStart: document.getElementById("event-start"),
    inputEnd: document.getElementById("event-end"),
    inputCategory: document.getElementById("event-category"),
    inputStatus: document.getElementById("event-status"),
    inputCustomColor: document.getElementById("event-custom-color"),
    inputPriority: document.getElementById("event-priority"),
    inputCustomIcon: document.getElementById("event-custom-icon"),
    colorSwatchBtns: document.querySelectorAll(".color-swatch-btn"),
    iconChips: document.querySelectorAll(".icon-chip"),
    inputFiles: document.getElementById("event-files-input"),
    existingAttachmentsList: document.getElementById("existing-attachments-list"),
    pendingAttachmentsList: document.getElementById("pending-attachments-list"),
    inputRecurrence: document.getElementById("event-recurrence"),
    recurrenceUntilWrapper: document.getElementById("recurrence-until-wrapper"),
    inputRecurrenceUntil: document.getElementById("event-recurrence-until"),
    recurrenceHint: document.getElementById("recurrence-hint"),
    inputLocation: document.getElementById("event-location"),
    inputNotes: document.getElementById("event-notes"),
    btnDeleteEvent: document.getElementById("btn-delete-event"),
    btnDeleteSeries: document.getElementById("btn-delete-series"),

    // Conflict Modal
    conflictModal: document.getElementById("conflict-modal"),
    conflictEventsList: document.getElementById("conflict-events-list"),
    btnConflictCancel: document.getElementById("btn-conflict-cancel"),
    btnConflictForce: document.getElementById("btn-conflict-force"),

    // Category Modal
    btnOpenCategoryModal: document.getElementById("btn-open-category-modal"),
    categoryModal: document.getElementById("category-modal"),
    btnCloseCategoryModal: document.getElementById("btn-close-category-modal"),
    btnCancelCategory: document.getElementById("btn-cancel-category"),
    categoryForm: document.getElementById("category-form"),
    inputCatName: document.getElementById("cat-name"),
    inputCatIcon: document.getElementById("cat-icon"),
    inputCatColor: document.getElementById("cat-color"),

    // File Preview Modal
    filePreviewModal: document.getElementById("file-preview-modal"),
    previewFileTitle: document.getElementById("preview-file-title"),
    previewFileDownload: document.getElementById("preview-file-download"),
    btnClosePreviewModal: document.getElementById("btn-close-preview-modal"),
    previewFileBody: document.getElementById("preview-file-body"),

    // PWA Install & Toast
    btnInstallPwa: document.getElementById("btn-install-pwa"),
    toastContainer: document.getElementById("toast-container"),
  };

  // ==========================================================================
  // 3. DATE, DAILY WORKING TIME & COUNTDOWN CALCULATION HELPERS
  // ==========================================================================
  const pad = (n) => String(n).padStart(2, "0");

  function toDatetimeLocalValue(dateObj) {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }

  function toDateInputValue(dateObj) {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function toTimeInputValue(dateObj) {
    if (!dateObj) return "08:00";
    const d = new Date(dateObj);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function getDailyWorkingMinutes(startStr, endStr) {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const startMins = s.getHours() * 60 + s.getMinutes();
    const endMins = e.getHours() * 60 + e.getMinutes();
    const diff = endMins - startMins;
    return diff > 0 ? diff : 60;
  }

  function formatDailyHoursLabel(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs}g${mins}p/ngày`;
    if (hrs > 0) return `${hrs}g/ngày`;
    return `${mins}p/ngày`;
  }

  function isMultiDayEvent(startStr, endStr) {
    const s = new Date(startStr);
    const e = new Date(endStr);
    return (
      s.getFullYear() !== e.getFullYear() ||
      s.getMonth() !== e.getMonth() ||
      s.getDate() !== e.getDate()
    );
  }

  function formatTimeRange(startStr, endStr) {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const sTime = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
    const eTime = `${pad(e.getHours())}:${pad(e.getMinutes())}`;
    const sDate = `${pad(s.getDate())}/${pad(s.getMonth() + 1)}`;
    const eDate = `${pad(e.getDate())}/${pad(e.getMonth() + 1)}`;
    const dailyLabel = formatDailyHoursLabel(getDailyWorkingMinutes(startStr, endStr));

    if (isMultiDayEvent(startStr, endStr)) {
      return `${sTime} - ${eTime} (${dailyLabel}) • ${sDate} → ${eDate}`;
    }
    return `${sTime} - ${eTime} (${sDate}) • ${dailyLabel}`;
  }

  function formatDurationHMS(diffMs) {
    const totalSeconds = Math.max(0, Math.floor(Math.abs(diffMs) / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}n ${pad(hours)}g ${pad(minutes)}p`;
    }
    return `${pad(hours)}g ${pad(minutes)}p ${pad(seconds)}s`;
  }

  const DISTINCT_PASTEL_COLORS = [
    "#A7F3D0", // Xanh Mint Sữa
    "#BAE6FD", // Xanh Bầu Trời
    "#DDD6FE", // Tím Lavender
    "#FDE68A", // Vàng Bơ
    "#FBCFE8", // Hồng Sakura
    "#FED7AA", // Cam Đào
    "#99F6E4", // Xanh Ngọc Aqua
    "#D9F99D", // Xanh Táo Non
    "#FECDD3", // Hồng San Hô
    "#C7D2FE", // Xanh Periwinkle
  ];

  function getEventEffectiveColor(ev) {
    return ev?.custom_color || ev?.category?.color || "#A7F3D0";
  }

  function getEventEffectiveIcon(ev) {
    return ev?.custom_icon || ev?.category?.icon || "🌿";
  }

  function getPriorityBadgeInfo(priority) {
    switch (priority) {
      case "urgent":
        return {
          icon: "🔥",
          label: "🔥 GẤP",
          chipClass: "bg-rose-100 text-rose-700 border-rose-300",
          fcClass: "priority-urgent",
        };
      case "important":
        return {
          icon: "⭐",
          label: "⭐ QUAN TRỌNG",
          chipClass: "bg-amber-100 text-amber-800 border-amber-300",
          fcClass: "priority-important",
        };
      case "exam":
        return {
          icon: "🎯",
          label: "🎯 DEADLINE",
          chipClass: "bg-purple-100 text-purple-800 border-purple-300",
          fcClass: "priority-exam",
        };
      default:
        return {
          icon: "",
          label: "",
          chipClass: "",
          fcClass: "priority-normal",
        };
    }
  }

  function highlightActiveColorSwatch(hexColor) {
    const upper = (hexColor || "").toUpperCase();
    if (el.inputCustomColor && upper.startsWith("#")) {
      el.inputCustomColor.value = upper;
    }
    if (el.modalCategoryDot && upper.startsWith("#")) {
      el.modalCategoryDot.style.backgroundColor = upper;
    }
    el.colorSwatchBtns.forEach((btn) => {
      const btnColor = (btn.getAttribute("data-preset-color") || "").toUpperCase();
      if (btnColor === upper) {
        btn.classList.add("ring-2", "ring-teal-700", "scale-110");
      } else {
        btn.classList.remove("ring-2", "ring-teal-700", "scale-110");
      }
    });
  }

  el.colorSwatchBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = btn.getAttribute("data-preset-color");
      if (c) highlightActiveColorSwatch(c);
    });
  });

  if (el.inputCustomColor) {
    el.inputCustomColor.addEventListener("input", (e) => {
      highlightActiveColorSwatch(e.target.value);
    });
  }

  el.iconChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const ic = chip.getAttribute("data-preset-icon");
      if (ic && el.inputCustomIcon) {
        el.inputCustomIcon.value = ic;
      }
    });
  });

  /**
   * Mở rộng 1 sự kiện kéo dài nhiều ngày (start_date -> end_date) thành các khung giờ làm việc
   * hàng ngày trên FullCalendar (không tô kín 24/24h cả cột lịch).
   */
  function expandEventToCalendarSlices(ev) {
    const color = getEventEffectiveColor(ev);
    const prio = getPriorityBadgeInfo(ev.priority);
    const s = new Date(ev.start_time);
    const e = new Date(ev.end_time);

    const startDay = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const endDay = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    const totalDays = Math.max(
      1,
      Math.round((endDay - startDay) / (24 * 60 * 60 * 1000)) + 1
    );

    const baseClasses = [prio.fcClass];
    if (ev.status === "completed") baseClasses.push("event-completed");

    if (totalDays === 1 || totalDays > 90) {
      return [
        {
          id: String(ev.id),
          title: ev.title,
          start: ev.start_time,
          end: ev.end_time,
          backgroundColor: color,
          borderColor: color,
          classNames: baseClasses,
          extendedProps: { ...ev, dayIndex: 1, totalDays: 1 },
        },
      ];
    }

    const slices = [];
    for (let i = 0; i < totalDays; i++) {
      const curDay = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
      const sliceStart = new Date(
        curDay.getFullYear(),
        curDay.getMonth(),
        curDay.getDate(),
        s.getHours(),
        s.getMinutes(),
        0
      );
      let sliceEnd = new Date(
        curDay.getFullYear(),
        curDay.getMonth(),
        curDay.getDate(),
        e.getHours(),
        e.getMinutes(),
        0
      );
      if (sliceEnd <= sliceStart) {
        sliceEnd = new Date(sliceStart.getTime() + 60 * 60 * 1000);
      }

      slices.push({
        id: `${ev.id}_day_${i + 1}`,
        groupId: `multi_${ev.id}`,
        title: ev.title,
        start: toDatetimeLocalValue(sliceStart),
        end: toDatetimeLocalValue(sliceEnd),
        backgroundColor: color,
        borderColor: color,
        classNames: baseClasses,
        extendedProps: {
          ...ev,
          dayIndex: i + 1,
          totalDays: totalDays,
          sliceDate: toDateInputValue(curDay),
        },
      });
    }
    return slices;
  }

  /**
   * Tính trạng thái đếm ngược thời gian hạn công việc & ca làm việc trong ngày
   */
  function getEventCountdownInfo(ev, now = new Date()) {
    if (ev.status === "completed") {
      return {
        phase: "completed",
        badgeText: "🍀 Đã hoàn thành",
        shortText: "🍀 Xong",
        timerText: "Hoàn thành",
        label: "Trạng thái:",
        progressPercent: 100,
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    }

    const start = new Date(ev.start_time);
    const end = new Date(ev.end_time);

    // Xác định khung giờ làm việc của ngày hôm nay (nếu hôm nay nằm trong khoảng start_date..end_date)
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    // Nếu đã quá hạn chót của ngày cuối cùng
    if (now > end) {
      const overdueMs = now - end;
      const hms = formatDurationHMS(overdueMs);
      return {
        phase: "overdue",
        isUrgent: true,
        remainingMs: -overdueMs,
        badgeText: `🚨 Quá hạn: ${hms}`,
        shortText: `🚨 Trễ ${hms}`,
        timerText: `Trễ ${hms}`,
        label: "Đã quá thời hạn:",
        progressPercent: 0,
        badgeClass: "bg-rose-100 text-rose-700 border-rose-300 urgent-pulse",
      };
    }

    // Xác định ca làm việc tiếp theo hoặc đang diễn ra trong ngày
    const refDay = todayDate < startDay ? startDay : todayDate;
    const sessionStart = new Date(
      refDay.getFullYear(),
      refDay.getMonth(),
      refDay.getDate(),
      start.getHours(),
      start.getMinutes(),
      0
    );
    let sessionEnd = new Date(
      refDay.getFullYear(),
      refDay.getMonth(),
      refDay.getDate(),
      end.getHours(),
      end.getMinutes(),
      0
    );
    if (sessionEnd <= sessionStart) {
      sessionEnd = new Date(sessionStart.getTime() + 60 * 60 * 1000);
    }

    // 1. Đang trong khung giờ làm việc của ngày hôm nay
    if (now >= sessionStart && now <= sessionEnd) {
      const remMs = sessionEnd - now;
      const totalSessionMs = Math.max(1000, sessionEnd - sessionStart);
      const elapsedPct = Math.min(
        100,
        Math.max(0, Math.round(((now - sessionStart) / totalSessionMs) * 100))
      );
      const isUrgent = remMs <= 15 * 60 * 1000;
      const hms = formatDurationHMS(remMs);
      return {
        phase: "active",
        isUrgent,
        remainingMs: remMs,
        badgeText: `${isUrgent ? "🔥 Ca hôm nay còn:" : "⏱️ Giờ làm còn:"} ${hms}`,
        shortText: `⏱️ ${hms}`,
        timerText: hms,
        label: "Giờ làm hôm nay còn:",
        progressPercent: 100 - elapsedPct,
        badgeClass: isUrgent
          ? "bg-amber-100 text-amber-800 border-amber-300 urgent-pulse"
          : "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    }

    // 2. Chưa tới giờ làm của ngày hôm nay (hoặc ngày bắt đầu)
    if (now < sessionStart) {
      const untilMs = sessionStart - now;
      const hms = formatDurationHMS(untilMs);
      const isSoon = untilMs <= 30 * 60 * 1000;
      return {
        phase: "upcoming",
        isUrgent: isSoon,
        remainingMs: untilMs,
        badgeText: `⏳ Đến giờ làm sau: ${hms}`,
        shortText: `⏳ ${hms}`,
        timerText: hms,
        label: "Đến giờ làm sau:",
        progressPercent: 100,
        badgeClass: isSoon
          ? "bg-teal-100 text-teal-800 border-teal-300"
          : "bg-cyan-50 text-teal-700 border-cyan-200",
      };
    }

    // 3. Đã xong khung giờ làm của hôm nay nhưng vẫn còn các ngày tiếp theo trước hạn chót (end)
    const nextSessionStart = new Date(sessionStart.getTime() + 24 * 60 * 60 * 1000);
    const totalDeadlineRemMs = end - now;
    const deadlineHms = formatDurationHMS(totalDeadlineRemMs);
    const nextSessionHms = formatDurationHMS(nextSessionStart - now);

    return {
      phase: "upcoming",
      isUrgent: false,
      remainingMs: totalDeadlineRemMs,
      badgeText: `🎯 Hạn nộp còn: ${deadlineHms}`,
      shortText: `🎯 Còn ${deadlineHms}`,
      timerText: deadlineHms,
      label: `Ca ngày mai sau ${nextSessionHms} • Hạn còn:`,
      progressPercent: 100,
      badgeClass: "bg-emerald-50 text-teal-800 border-emerald-200",
    };
  }

  // ==========================================================================
  // 4. CUTE MINT CONFETTI, TOAST & FILE HELPERS
  // ==========================================================================
  function spawnCuteConfetti(x, y) {
    const emojis = ["🍀", "🌿", "✨", "🌱", "💚", "🌼", "🎉"];
    const originX = x || window.innerWidth - 180;
    const originY = y || window.innerHeight - 160;

    for (let i = 0; i < 12; i++) {
      const span = document.createElement("span");
      span.className = "cute-confetti-particle";
      span.textContent = emojis[i % emojis.length];
      const offsetX = (Math.random() - 0.5) * 140;
      const offsetY = (Math.random() - 0.5) * 50;
      span.style.left = `${originX + offsetX}px`;
      span.style.top = `${originY + offsetY}px`;
      document.body.appendChild(span);
      setTimeout(() => span.remove(), 1000);
    }
  }

  function showToast(message, type = "success") {
    const colors = {
      success: "bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 border-emerald-300",
      warning: "bg-amber-500 text-white border-amber-200",
      error: "bg-rose-500 text-white border-rose-200",
      info: "bg-teal-600 text-white border-teal-200",
    };
    const icons = {
      success: "🍀",
      warning: "🙊",
      error: "🥺",
      info: "🌿",
    };

    const toast = document.createElement("div");
    toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border-2 text-xs sm:text-sm font-extrabold animate-modal ${
      colors[type] || colors.info
    }`;
    toast.innerHTML = `
      <span class="text-base">${icons[type] || "🌿"}</span>
      <span class="flex-1">${escapeHtml(message)}</span>
    `;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.25s ease";
      setTimeout(() => toast.remove(), 250);
    }, 3400);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(filename, contentType = "") {
    const lower = (filename || "").toLowerCase();
    const ct = (contentType || "").toLowerCase();
    if (ct.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(lower)) return "🖼️";
    if (ct.includes("pdf") || lower.endsWith(".pdf")) return "📕";
    if (/\.(doc|docx|rtf)$/.test(lower)) return "📘";
    if (/\.(xls|xlsx|csv)$/.test(lower)) return "📗";
    if (/\.(ppt|pptx)$/.test(lower)) return "📙";
    if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) return "🗜️";
    if (/\.(py|js|ts|html|css|json|sql|md|txt)$/.test(lower)) return "💻";
    return "📄";
  }

  // ==========================================================================
  // 5. MULTITASKING FILE PREVIEW & ATTACHMENT UPLOAD HELPERS
  // ==========================================================================
  function openFilePreviewModal(att) {
    if (!att) return;
    el.previewFileTitle.textContent = `${getFileIcon(att.filename, att.content_type)} ${
      att.filename
    } (${formatFileSize(att.file_size)})`;
    el.previewFileDownload.href = att.file_url;
    el.previewFileDownload.setAttribute("download", att.filename);

    const lower = (att.filename || "").toLowerCase();
    const ct = (att.content_type || "").toLowerCase();
    const isImage =
      ct.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(lower);
    const isPdfOrText =
      ct.includes("pdf") ||
      ct.startsWith("text/") ||
      /\.(pdf|txt|md|json|csv|html)$/.test(lower);

    if (isImage) {
      el.previewFileBody.innerHTML = `
        <img
          src="${escapeHtml(att.file_url)}"
          alt="${escapeHtml(att.filename)}"
          class="max-w-full max-h-full object-contain rounded-2xl shadow-md bg-white p-2"
        />
      `;
    } else if (isPdfOrText) {
      el.previewFileBody.innerHTML = `
        <iframe
          src="${escapeHtml(att.file_url)}"
          class="w-full h-full rounded-2xl bg-white border border-emerald-200"
          title="${escapeHtml(att.filename)}"
        ></iframe>
      `;
    } else {
      el.previewFileBody.innerHTML = `
        <div class="bg-white rounded-3xl p-8 text-center max-w-md border-2 border-emerald-200 shadow-sm space-y-3">
          <div class="text-5xl">${getFileIcon(att.filename, att.content_type)}</div>
          <h4 class="text-base font-extrabold text-teal-950 break-all">${escapeHtml(
            att.filename
          )}</h4>
          <p class="text-xs text-teal-600 font-medium">
            Dung lượng: ${formatFileSize(att.file_size)}
          </p>
          <div class="pt-2">
            <a
              href="${escapeHtml(att.file_url)}"
              target="_blank"
              download="${escapeHtml(att.filename)}"
              class="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-teal-950 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-md"
            >
              ⬇️ Tải xuống & Mở File ngay
            </a>
          </div>
        </div>
      `;
    }

    el.filePreviewModal.classList.remove("hidden");
    el.filePreviewModal.classList.add("flex");
  }

  function closeFilePreviewModal() {
    el.filePreviewModal.classList.add("hidden");
    el.filePreviewModal.classList.remove("flex");
    el.previewFileBody.innerHTML = "";
  }

  el.btnClosePreviewModal.addEventListener("click", closeFilePreviewModal);

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          file_size: file.size,
          data_base64: reader.result,
        });
      };
      reader.onerror = () => reject(new Error(`Không thể đọc file ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  el.inputFiles.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) {
        showToast(`File "${f.name}" lớn hơn 20MB, vui lòng chọn file nhỏ hơn!`, "warning");
        continue;
      }
      try {
        const item = await readFileAsBase64(f);
        state.pendingFiles.push(item);
      } catch (err) {
        showToast(err.message, "error");
      }
    }
    el.inputFiles.value = "";
    renderModalAttachments();
  });

  function renderModalAttachments() {
    const existing = state.currentEditingEvent?.attachments || [];
    if (existing.length === 0) {
      el.existingAttachmentsList.innerHTML = "";
    } else {
      el.existingAttachmentsList.innerHTML = existing
        .map(
          (att) => `
          <div class="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-2xs">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-base shrink-0">${getFileIcon(
                att.filename,
                att.content_type
              )}</span>
              <div class="min-w-0">
                <p class="text-xs font-extrabold text-teal-950 truncate">${escapeHtml(
                  att.filename
                )}</p>
                <p class="text-[10px] text-teal-600 font-semibold">${formatFileSize(
                  att.file_size
                )} • Đã gắn vào lịch</p>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-preview-att="${att.id}"
                class="px-2.5 py-1 text-[11px] font-extrabold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition cursor-pointer"
              >
                👁️ Mở
              </button>
              <button
                type="button"
                data-delete-att="${att.id}"
                class="p-1 text-rose-500 hover:bg-rose-50 rounded-lg font-bold cursor-pointer"
                title="Gỡ file này"
              >
                ✕
              </button>
            </div>
          </div>
        `
        )
        .join("");

      el.existingAttachmentsList.querySelectorAll("[data-preview-att]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const attId = Number(btn.getAttribute("data-preview-att"));
          const target = existing.find((x) => x.id === attId);
          if (!target) return;
          try {
            const res = await fetch(`/api/attachments/${target.id}/open`, {
              method: "POST",
            });
            if (res.ok) {
              const data = await res.json();
              if (data.opened_native) {
                showToast(`Đang mở "${target.filename}" trên máy tính! 🌿`);
                return;
              }
            }
          } catch (err) {}
          openFilePreviewModal(target);
        });
      });

      el.existingAttachmentsList.querySelectorAll("[data-delete-att]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const attId = Number(btn.getAttribute("data-delete-att"));
          try {
            const res = await fetch(`/api/attachments/${attId}`, { method: "DELETE" });
            if (res.ok) {
              state.currentEditingEvent.attachments = existing.filter(
                (x) => x.id !== attId
              );
              renderModalAttachments();
              state.calendar.refetchEvents();
              refreshAllTodoEvents();
              showToast("Đã gỡ file đính kèm.");
            }
          } catch (err) {
            showToast("Không thể gỡ file.", "error");
          }
        });
      });
    }

    if (state.pendingFiles.length === 0) {
      el.pendingAttachmentsList.innerHTML = "";
    } else {
      el.pendingAttachmentsList.innerHTML = state.pendingFiles
        .map(
          (item, idx) => `
          <div class="flex items-center justify-between gap-2 bg-emerald-50/90 px-3 py-1.5 rounded-xl border border-emerald-300">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-base">${getFileIcon(
                item.filename,
                item.content_type
              )}</span>
              <div class="min-w-0">
                <p class="text-xs font-extrabold text-teal-900 truncate">${escapeHtml(
                  item.filename
                )}</p>
                <p class="text-[10px] text-emerald-700 font-bold">${formatFileSize(
                  item.file_size
                )} • Sẵn sàng tải lên khi bấm Lưu</p>
              </div>
            </div>
            <button
              type="button"
              data-remove-pending="${idx}"
              class="px-2 py-0.5 text-xs font-extrabold text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        `
        )
        .join("");

      el.pendingAttachmentsList
        .querySelectorAll("[data-remove-pending]")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-remove-pending"));
            state.pendingFiles.splice(idx, 1);
            renderModalAttachments();
          });
        });
    }
  }

  // ==========================================================================
  // 6. CATEGORIES API & UI RENDERING
  // ==========================================================================
  const STORAGE_KEYS = {
    CATEGORIES: "smartschedule_categories_backup_v1",
    EVENTS: "smartschedule_events_backup_v1",
  };
  let isServerOffline = false;

  function saveEventsToLocalBackup(eventsList) {
    try {
      const existingRaw = localStorage.getItem(STORAGE_KEYS.EVENTS);
      const existingMap = new Map();
      if (existingRaw) {
        JSON.parse(existingRaw).forEach((ev) => existingMap.set(ev.id, ev));
      }
      eventsList.forEach((ev) => existingMap.set(ev.id, ev));
      localStorage.setItem(
        STORAGE_KEYS.EVENTS,
        JSON.stringify(Array.from(existingMap.values()))
      );
    } catch (e) {}
  }

  function loadEventsFromLocalBackup() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EVENTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Không thể tải danh mục");
      state.categories = await res.json();
      try {
        localStorage.setItem(
          STORAGE_KEYS.CATEGORIES,
          JSON.stringify(state.categories)
        );
      } catch (e) {}
      renderCategoryControls();
    } catch (err) {
      const cached = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (cached) {
        state.categories = JSON.parse(cached);
      } else {
        state.categories = [
          { id: 1, name: "Học tập", color: "#A7F3D0", icon: "🌿", is_default: true },
          { id: 2, name: "Công việc", color: "#BAE6FD", icon: "💼", is_default: true },
          { id: 3, name: "Cá nhân", color: "#BBF7D0", icon: "🍀", is_default: true },
          { id: 4, name: "Khác", color: "#FDE68A", icon: "🧸", is_default: true },
        ];
      }
      renderCategoryControls();
    }
  }

  function renderCategoryControls() {
    el.inputCategory.innerHTML = state.categories
      .map(
        (cat) =>
          `<option value="${cat.id}" data-color="${escapeHtml(cat.color)}">${escapeHtml(
            cat.icon || "🌿"
          )} ${escapeHtml(cat.name)}</option>`
      )
      .join("");

    updateModalCategoryDot();

    const countsByCat = {};
    state.events.forEach((ev) => {
      const cid = ev.category_id;
      if (cid) countsByCat[cid] = (countsByCat[cid] || 0) + 1;
    });

    const allActive = state.selectedCategoryId === null;
    let sidebarHtml = `
      <button
        type="button"
        data-cat-id=""
        class="cat-filter-item w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-extrabold transition cursor-pointer ${
          allActive
            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 shadow-sm shadow-emerald-200"
            : "text-teal-800 hover:bg-emerald-50"
        }"
      >
        <span class="flex items-center gap-2.5">
          <span>🍀</span>
          <span>Tất cả danh mục</span>
        </span>
        <span class="text-[11px] px-2 py-0.5 rounded-full ${
          allActive ? "bg-white/65 text-teal-950" : "bg-emerald-50 text-emerald-700"
        }">${state.events.length}</span>
      </button>
    `;

    state.categories.forEach((cat) => {
      const isActive = state.selectedCategoryId === cat.id;
      const count = countsByCat[cat.id] || 0;
      sidebarHtml += `
        <div class="group flex items-center gap-1">
          <button
            type="button"
            data-cat-id="${cat.id}"
            class="cat-filter-item flex-1 flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
              isActive
                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                : "text-teal-900 hover:bg-emerald-50/80"
            }"
          >
            <span class="flex items-center gap-2.5 truncate">
              <span class="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style="background-color: ${escapeHtml(
                cat.color
              )}"></span>
              <span class="truncate">${escapeHtml(cat.icon || "🌿")} ${escapeHtml(
        cat.name
      )}</span>
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded-full ${
              isActive ? "bg-emerald-200 text-emerald-900" : "bg-emerald-50 text-teal-700"
            }">${count}</span>
          </button>
          ${
            !cat.is_default
              ? `<button
                  type="button"
                  data-delete-cat="${cat.id}"
                  class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                  title="Xóa danh mục"
                >&times;</button>`
              : ""
          }
        </div>
      `;
    });

    el.sidebarCategoryList.innerHTML = sidebarHtml;

    let mobileChipsHtml = `
      <button
        type="button"
        data-cat-id=""
        class="cat-filter-item shrink-0 px-3 py-1 rounded-full text-xs font-extrabold border transition ${
          allActive
            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 border-emerald-400"
            : "bg-emerald-50 text-teal-800 border-emerald-200"
        }"
      >
        🍀 Tất cả
      </button>
    `;

    state.categories.forEach((cat) => {
      const isActive = state.selectedCategoryId === cat.id;
      mobileChipsHtml += `
        <button
          type="button"
          data-cat-id="${cat.id}"
          class="cat-filter-item shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
            isActive
              ? "bg-teal-700 text-white border-teal-700"
              : "bg-white text-teal-800 border-emerald-200"
          }"
        >
          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${escapeHtml(
            cat.color
          )}"></span>
          <span>${escapeHtml(cat.icon || "🌿")} ${escapeHtml(cat.name)}</span>
        </button>
      `;
    });

    el.mobileCategoryChips.innerHTML = mobileChipsHtml;

    document.querySelectorAll(".cat-filter-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rawId = btn.getAttribute("data-cat-id");
        state.selectedCategoryId = rawId ? Number(rawId) : null;
        renderCategoryControls();
        if (state.calendar) {
          state.calendar.refetchEvents();
        }
      });
    });

    document.querySelectorAll("[data-delete-cat]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const catId = Number(btn.getAttribute("data-delete-cat"));
        if (!confirm("Bạn có chắc muốn xóa danh mục này?")) return;
        try {
          const res = await fetch(`/api/categories/${catId}`, { method: "DELETE" });
          if (res.ok) {
            if (state.selectedCategoryId === catId) {
              state.selectedCategoryId = null;
            }
            await loadCategories();
            state.calendar.refetchEvents();
            showToast("Đã xóa danh mục.");
          }
        } catch (err) {
          showToast("Không thể xóa danh mục.", "error");
        }
      });
    });
  }

  function updateModalCategoryDot() {
    const selectedOpt = el.inputCategory.options[el.inputCategory.selectedIndex];
    const color = selectedOpt ? selectedOpt.getAttribute("data-color") : "#A7F3D0";
    el.modalCategoryDot.style.backgroundColor = color || "#A7F3D0";
  }

  el.inputCategory.addEventListener("change", updateModalCategoryDot);

  // ==========================================================================
  // 7. SIDEBAR STATS, MASCOT MOOD & UPCOMING LIST
  // ==========================================================================
  function updateSidebarStatsAndAgenda(events) {
    const total = events.length;
    const completed = events.filter((e) => e.status === "completed").length;
    const pending = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    el.statTotal.textContent = total;
    el.statPending.textContent = pending;
    el.statCompleted.textContent = completed;
    el.statPercent.textContent = `${percent}%`;
    el.statProgressBar.style.width = `${percent}%`;
    el.upcomingCountBadge.textContent = total;

    if (total === 0) {
      el.mascotMoodIcon.textContent = "🐰";
      el.mascotCheerText.textContent = "Thêm lịch mới để bắt đầu ngày xanh mát nhé 🌿";
    } else if (percent === 100) {
      el.mascotMoodIcon.textContent = "🥳";
      el.mascotCheerText.textContent = "Xuất sắc! Bạn đã hoàn thành 100% việc! 🍀";
    } else if (percent >= 50) {
      el.mascotMoodIcon.textContent = "😺";
      el.mascotCheerText.textContent = `Tuyệt lắm! Đã xong ${completed}/${total} công việc rồi ✨`;
    } else {
      el.mascotMoodIcon.textContent = "🐰";
      el.mascotCheerText.textContent = `Cố lên nào! Còn ${pending} việc đang chờ bạn 🌱`;
    }

    if (events.length === 0) {
      el.sidebarUpcomingList.innerHTML = `
        <div class="text-center py-6 px-3 bg-emerald-50/50 rounded-2xl border-2 border-dashed border-emerald-200">
          <div class="text-2xl mb-1">🌱</div>
          <p class="text-xs text-teal-600 font-bold">Chưa có lịch nào trong khoảng này.</p>
        </div>
      `;
      return;
    }

    const sorted = [...events].sort(
      (a, b) => new Date(a.start_time) - new Date(b.start_time)
    );

    const now = new Date();
    el.sidebarUpcomingList.innerHTML = sorted
      .slice(0, 18)
      .map((ev) => {
        const color = getEventEffectiveColor(ev);
        const icon = getEventEffectiveIcon(ev);
        const prio = getPriorityBadgeInfo(ev.priority);
        const isDone = ev.status === "completed";
        const cd = getEventCountdownInfo(ev, now);
        const atts = ev.attachments || [];

        const filesHtml =
          atts.length > 0
            ? `<div class="flex flex-col gap-1 mt-1.5 overflow-hidden">
                ${atts
                  .map(
                    (att) => `
                  <button
                    type="button"
                    data-quick-preview-ev="${ev.id}"
                    data-quick-preview-att="${att.id}"
                    class="w-full inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-50 hover:bg-emerald-100 text-teal-800 border border-teal-200 transition cursor-pointer overflow-hidden"
                    title="Bấm để mở file: ${escapeHtml(att.filename)}"
                  >
                    <span class="shrink-0">${getFileIcon(
                      att.filename,
                      att.content_type
                    )}</span>
                    <span class="truncate">${escapeHtml(att.filename)}</span>
                  </button>
                `
                  )
                  .join("")}
              </div>`
            : "";

        return `
          <div
            data-agenda-id="${ev.id}"
            style="border-left: 5px solid ${escapeHtml(color)}"
            class="agenda-item group p-2.5 rounded-2xl border-2 border-emerald-100 hover:border-emerald-300 bg-white hover:shadow-sm transition cursor-pointer overflow-hidden"
          >
            <div class="flex items-start gap-2">
              <button
                type="button"
                data-toggle-status="${ev.id}"
                class="mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition cursor-pointer ${
                  isDone
                    ? "bg-emerald-500 border-emerald-500 text-teal-950 font-bold"
                    : "border-emerald-300 hover:border-emerald-500 bg-emerald-50/40"
                }"
                title="${isDone ? "Đánh dấu Chưa làm" : "Đánh dấu Hoàn thành"}"
              >
                ${isDone ? "✓" : ""}
              </button>
              <div class="flex-1 min-w-0 overflow-hidden">
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full shrink-0 border border-black/10" style="background-color: ${escapeHtml(
                    color
                  )}"></span>
                  <span class="text-xs shrink-0">${escapeHtml(icon)}</span>
                  <p class="text-xs font-extrabold text-teal-950 truncate ${
                    isDone ? "line-through text-slate-400" : ""
                  }">
                    ${escapeHtml(ev.title)}
                  </p>
                </div>
                <p class="text-[11px] text-teal-700 font-semibold mt-0.5 truncate">
                  ${formatTimeRange(ev.start_time, ev.end_time)}
                </p>
                <div class="mt-1 flex items-center gap-1 flex-wrap">
                  ${
                    prio.label
                      ? `<span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${prio.chipClass}">${prio.label}</span>`
                      : ""
                  }
                  <span
                    data-countdown-badge="${ev.id}"
                    class="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${cd.badgeClass}"
                  >
                    ${cd.badgeText}
                  </span>
                </div>
                ${filesHtml}
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    bindQuickEventActions(el.sidebarUpcomingList);
  }

  function bindQuickEventActions(container) {
    container.querySelectorAll("[data-toggle-status]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const evId = Number(btn.getAttribute("data-toggle-status"));
        const targetEv =
          state.events.find((x) => x.id === evId) ||
          state.allTodoEvents.find((x) => x.id === evId);
        const nextStatus =
          targetEv && targetEv.status === "completed" ? "pending" : "completed";
        if (nextStatus === "completed") {
          spawnCuteConfetti(e.clientX, e.clientY);
        }
        await quickToggleEventStatus(evId, nextStatus);
      });
    });

    container.querySelectorAll("[data-quick-preview-att]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const evId = Number(btn.getAttribute("data-quick-preview-ev"));
        const attId = Number(btn.getAttribute("data-quick-preview-att"));
        const targetEv =
          state.events.find((x) => x.id === evId) ||
          state.allTodoEvents.find((x) => x.id === evId);
        const att = targetEv?.attachments?.find((a) => a.id === attId);
        if (!att) return;

        try {
          const res = await fetch(`/api/attachments/${att.id}/open`, {
            method: "POST",
          });
          if (res.ok) {
            const data = await res.json();
            if (data.opened_native) {
              showToast(`Đang mở file "${att.filename}" trên máy tính! 🌿`);
              return;
            }
          }
        } catch (err) {}
        openFilePreviewModal(att);
      });
    });

    container.querySelectorAll("[data-agenda-id]").forEach((card) => {
      card.addEventListener("click", () => {
        const evId = Number(card.getAttribute("data-agenda-id"));
        const targetEv =
          state.events.find((x) => x.id === evId) ||
          state.allTodoEvents.find((x) => x.id === evId);
        if (targetEv) {
          openEditEventModal(targetEv);
        }
      });
    });
  }

  async function quickToggleEventStatus(eventId, newStatus) {
    try {
      const res = await fetch(`/api/events/${eventId}?force=true`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(
          newStatus === "completed"
            ? "Yay! Đã hoàn thành công việc rồi 🍀✨"
            : "Đã chuyển công việc về trạng thái Cần làm."
        );
        state.calendar.refetchEvents();
        await refreshAllTodoEvents();
      }
    } catch (err) {
      showToast("Không thể cập nhật trạng thái.", "error");
    }
  }

  // ==========================================================================
  // 8. ALWAYS-ON DESKTOP FLOATING TASK NOTIFICATION & COUNTDOWN HUD
  // ==========================================================================
  async function refreshAllTodoEvents() {
    try {
      const now = new Date();
      const rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `/api/events?start=${encodeURIComponent(rangeStart)}&end=${encodeURIComponent(
          rangeEnd
        )}&status=pending`
      );
      if (!res.ok) throw new Error("Server offline");
      state.allTodoEvents = await res.json();
      saveEventsToLocalBackup(state.allTodoEvents);
      renderDesktopTaskHud();
    } catch (err) {
      const cached = loadEventsFromLocalBackup().filter((e) => e.status === "pending");
      state.allTodoEvents = cached;
      renderDesktopTaskHud();
    }
  }

  function renderDesktopTaskHud() {
    const now = new Date();
    const pendingList = [...state.allTodoEvents].sort(
      (a, b) => new Date(a.end_time) - new Date(b.end_time)
    );

    el.hudBadgeCount.textContent = pendingList.length;
    el.hudPendingCount.textContent = pendingList.length;

    if (pendingList.length === 0) {
      el.hudFocusBox.innerHTML = `
        <div class="text-center py-3">
          <div class="text-3xl mb-1">🐰🌿</div>
          <p class="text-xs font-extrabold text-teal-900">Tuyệt vời! Không còn việc tồn đọng!</p>
          <p class="text-[11px] text-teal-600 mt-0.5">Bạn có thể thư giãn hoặc thêm lịch mới nhé 🍀</p>
        </div>
      `;
      el.hudTaskList.innerHTML = "";
      updatePipWindowContent();
      return;
    }

    const activeTask = pendingList.find((ev) => {
      const cd = getEventCountdownInfo(ev, now);
      return cd.phase === "active";
    });
    const focusTask = activeTask || pendingList[0];
    const focusCd = getEventCountdownInfo(focusTask, now);
    const focusAtts = focusTask.attachments || [];

    el.hudFocusBox.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-200">
          ${
            focusCd.phase === "active"
              ? "🔥 Đang trong giờ làm việc"
              : focusCd.phase === "overdue"
              ? "🚨 Cần xử lý ngay"
              : "🌟 Việc sắp tới gần nhất"
          }
        </span>
        <span class="text-[10px] font-bold text-teal-700">
          ${escapeHtml(focusTask.category?.icon || "🌿")} ${escapeHtml(
      focusTask.category?.name || "Công việc"
    )}
        </span>
      </div>

      <div class="flex items-start justify-between gap-2 mt-1">
        <div class="min-w-0">
          <h5
            data-hud-open="${focusTask.id}"
            class="text-sm font-extrabold text-teal-950 truncate hover:text-emerald-600 cursor-pointer"
          >
            ${escapeHtml(focusTask.title)}
          </h5>
          <p class="text-[11px] text-teal-700 font-semibold">
            🕒 ${formatTimeRange(focusTask.start_time, focusTask.end_time)}
          </p>
        </div>
        <button
          type="button"
          data-toggle-status="${focusTask.id}"
          class="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-teal-950 text-[11px] font-extrabold shadow-xs shrink-0 cursor-pointer transition"
        >
          ✓ Xong
        </button>
      </div>

      <!-- Đồng hồ đếm ngược thời gian hạn công việc -->
      <div class="mt-2.5 bg-white/90 rounded-xl p-2 border border-emerald-200 flex items-center justify-between gap-2">
        <span class="text-[11px] font-bold text-teal-800 truncate">${focusCd.label}</span>
        <span
          id="hud-focus-timer"
          data-focus-event-id="${focusTask.id}"
          class="text-sm font-extrabold text-emerald-700 tracking-tight shrink-0"
        >
          ${focusCd.timerText}
        </span>
      </div>

      <div class="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden mt-2">
        <div
          id="hud-focus-progress"
          class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
          style="width: ${focusCd.progressPercent}%"
        ></div>
      </div>

      ${
        focusAtts.length > 0
          ? `<div class="flex flex-col gap-1 mt-2 pt-2 border-t border-emerald-200/60">
              ${focusAtts
                .map(
                  (att) => `
                <button
                  type="button"
                  data-quick-preview-ev="${focusTask.id}"
                  data-quick-preview-att="${att.id}"
                  class="w-full inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-white hover:bg-emerald-100 text-teal-800 border border-emerald-200 shadow-2xs transition cursor-pointer overflow-hidden"
                >
                  <span class="shrink-0">${getFileIcon(
                    att.filename,
                    att.content_type
                  )}</span>
                  <span class="truncate">${escapeHtml(att.filename)}</span>
                </button>
              `
                )
                .join("")}
            </div>`
          : ""
      }
    `;

    el.hudTaskList.innerHTML = pendingList
      .map((ev) => {
        const cd = getEventCountdownInfo(ev, now);
        const color = getEventEffectiveColor(ev);
        const icon = getEventEffectiveIcon(ev);
        const prio = getPriorityBadgeInfo(ev.priority);
        const atts = ev.attachments || [];

        return `
          <div
            data-agenda-id="${ev.id}"
            style="border-left: 5px solid ${escapeHtml(color)}"
            class="p-2.5 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-200/80 transition cursor-pointer overflow-hidden"
          >
            <div class="flex items-start gap-2">
              <button
                type="button"
                data-toggle-status="${ev.id}"
                class="mt-0.5 w-4 h-4 rounded-md border-2 border-emerald-400 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white flex items-center justify-center text-[10px] shrink-0 transition cursor-pointer"
                title="Đánh dấu Đã xong"
              ></button>
              <div class="flex-1 min-w-0 overflow-hidden">
                <div class="flex items-center justify-between gap-1">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" style="background-color: ${escapeHtml(
                      color
                    )}"></span>
                    <span class="text-xs shrink-0">${escapeHtml(icon)}</span>
                    <p class="text-xs font-extrabold text-teal-950 truncate">
                      ${escapeHtml(ev.title)}
                    </p>
                  </div>
                  ${
                    prio.label
                      ? `<span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border shrink-0 ${prio.chipClass}">${prio.label}</span>`
                      : ""
                  }
                </div>
                <div class="flex items-center justify-between gap-1 mt-1">
                  <span class="text-[10px] text-teal-700 font-semibold truncate">
                    ${formatTimeRange(ev.start_time, ev.end_time)}
                  </span>
                  <span
                    data-countdown-badge="${ev.id}"
                    class="text-[10px] font-extrabold px-2 py-0.2 rounded-full border shrink-0 ${cd.badgeClass}"
                  >
                    ${cd.shortText}
                  </span>
                </div>
                ${
                  atts.length > 0
                    ? `<div class="flex flex-col gap-1 mt-1.5">
                        ${atts
                          .map(
                            (att) => `
                          <button
                            type="button"
                            data-quick-preview-ev="${ev.id}"
                            data-quick-preview-att="${att.id}"
                            class="w-full inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer overflow-hidden"
                          >
                            <span class="shrink-0">${getFileIcon(
                              att.filename,
                              att.content_type
                            )}</span>
                            <span class="truncate">${escapeHtml(att.filename)}</span>
                          </button>
                        `
                          )
                          .join("")}
                      </div>`
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    bindQuickEventActions(el.hudFocusBox);
    bindQuickEventActions(el.hudTaskList);

    const openTitle = el.hudFocusBox.querySelector("[data-hud-open]");
    if (openTitle) {
      openTitle.addEventListener("click", () => openEditEventModal(focusTask));
    }

    updatePipWindowContent();
  }

  // ==========================================================================
  // 9. REAL-TIME 1-SECOND TICKER (CLOCK, COUNTDOWNS & DESKTOP ALERTS)
  // ==========================================================================
  function tickEverySecond() {
    const now = new Date();

    if (el.headerLiveClock) {
      const daysVi = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
        now.getSeconds()
      )}`;
      const dateStr = `${daysVi[now.getDay()]}, ${pad(now.getDate())}/${pad(
        now.getMonth() + 1
      )}`;
      el.headerLiveClock.textContent = `🌿 ${dateStr} • ${timeStr}`;
    }

    const focusTimerEl = document.getElementById("hud-focus-timer");
    const focusProgressEl = document.getElementById("hud-focus-progress");
    if (focusTimerEl) {
      const focusId = Number(focusTimerEl.getAttribute("data-focus-event-id"));
      const focusEv = state.allTodoEvents.find((x) => x.id === focusId);
      if (focusEv) {
        const cd = getEventCountdownInfo(focusEv, now);
        focusTimerEl.textContent = cd.timerText;
        if (focusProgressEl) {
          focusProgressEl.style.width = `${cd.progressPercent}%`;
        }
      }
    }

    const allKnownEvents = [...state.events, ...state.allTodoEvents];
    document.querySelectorAll("[data-countdown-badge]").forEach((badge) => {
      const evId = Number(badge.getAttribute("data-countdown-badge"));
      const ev = allKnownEvents.find((x) => x.id === evId);
      if (!ev) return;
      const cd = getEventCountdownInfo(ev, now);
      const isHudShort = el.hudTaskList && el.hudTaskList.contains(badge);
      badge.textContent = isHudShort ? cd.shortText : cd.badgeText;
    });

    if (
      state.currentEditingEvent &&
      !el.eventModal.classList.contains("hidden") &&
      !el.modalCountdownBanner.classList.contains("hidden")
    ) {
      const cd = getEventCountdownInfo(state.currentEditingEvent, now);
      el.modalCountdownLabel.textContent = cd.label;
      el.modalCountdownTimer.textContent = cd.timerText;
    }

    checkAndFireDesktopNotifications(now);

    if (state.pipWindow && !state.pipWindow.closed) {
      const pipDoc = state.pipWindow.document;
      const pipTimer = pipDoc.getElementById("hud-focus-timer");
      const pipProgress = pipDoc.getElementById("hud-focus-progress");
      if (pipTimer && focusTimerEl) {
        pipTimer.textContent = focusTimerEl.textContent;
      }
      if (pipProgress && focusProgressEl) {
        pipProgress.style.width = focusProgressEl.style.width;
      }
      pipDoc.querySelectorAll("[data-countdown-badge]").forEach((badge) => {
        const evId = Number(badge.getAttribute("data-countdown-badge"));
        const ev = allKnownEvents.find((x) => x.id === evId);
        if (!ev) return;
        const cd = getEventCountdownInfo(ev, now);
        badge.textContent = cd.shortText;
      });
    }
  }

  setInterval(tickEverySecond, 1000);

  // ==========================================================================
  // 10. DRAGGABLE HUD, ALWAYS-ON-TOP PIP WINDOW & WINDOWS NOTIFICATIONS
  // ==========================================================================
  (function initDraggableHud() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    el.hudDragHandle.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      isDragging = true;
      const rect = el.desktopTaskHud.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = rect.left;
      initialTop = rect.top;
      el.desktopTaskHud.style.right = "auto";
      el.desktopTaskHud.style.bottom = "auto";
      el.desktopTaskHud.style.left = `${initialLeft}px`;
      el.desktopTaskHud.style.top = `${initialTop}px`;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const maxLeft = window.innerWidth - el.desktopTaskHud.offsetWidth - 8;
      const maxTop = window.innerHeight - 48;
      const nextLeft = Math.max(8, Math.min(maxLeft, initialLeft + dx));
      const nextTop = Math.max(8, Math.min(maxTop, initialTop + dy));
      el.desktopTaskHud.style.left = `${nextLeft}px`;
      el.desktopTaskHud.style.top = `${nextTop}px`;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  })();

  el.btnMinimizeHud.addEventListener("click", () => {
    state.hudMinimized = !state.hudMinimized;
    el.hudBody.classList.toggle("hidden", state.hudMinimized);
    el.btnMinimizeHud.textContent = state.hudMinimized ? "▢" : "—";
  });

  el.btnToggleHud.addEventListener("click", () => {
    const isHidden = el.desktopTaskHud.classList.contains("hidden");
    if (isHidden) {
      el.desktopTaskHud.classList.remove("hidden");
      state.hudMinimized = false;
      el.hudBody.classList.remove("hidden");
      el.btnMinimizeHud.textContent = "—";
    } else {
      el.desktopTaskHud.classList.add("hidden");
    }
  });

  el.btnHudQuickAdd.addEventListener("click", () => openCreateEventModal());

  el.btnEnableDesktopNotify.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      showToast("Trình duyệt này không hỗ trợ thông báo hệ thống.", "warning");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      el.btnEnableDesktopNotify.textContent = "🔔";
      showToast("Đã bật thông báo nhắc việc trên màn hình máy tính! 🌿");
      new Notification("SmartSchedule 🌿", {
        body: "Bé Thỏ sẽ nhắc bạn mỗi khi công việc bắt đầu hoặc sắp tới hạn nhé!",
        icon: "/static/icons/icon-192.png",
      });
    } else {
      showToast("Bạn chưa cấp quyền thông báo cho trình duyệt.", "warning");
    }
  });

  function checkAndFireDesktopNotifications(now) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    state.allTodoEvents.forEach((ev) => {
      if (ev.status === "completed") return;
      const start = new Date(ev.start_time);
      const end = new Date(ev.end_time);

      const diffStartMin = Math.round((start - now) / 60000);
      const diffEndMin = Math.round((end - now) / 60000);

      if (diffStartMin === 0 && !state.notifiedKeys.has(`start_${ev.id}`)) {
        state.notifiedKeys.add(`start_${ev.id}`);
        new Notification(`🌿 Đến giờ làm việc: ${ev.title}`, {
          body: `Khung giờ: ${formatTimeRange(ev.start_time, ev.end_time)}`,
          icon: "/static/icons/icon-192.png",
        });
      }

      if (diffEndMin === 10 && !state.notifiedKeys.has(`deadline10_${ev.id}`)) {
        state.notifiedKeys.add(`deadline10_${ev.id}`);
        new Notification(`⏰ Còn 10 phút là hết hạn: ${ev.title}`, {
          body: "Cố lên nào! Sắp hoàn thành công việc rồi 🍀",
          icon: "/static/icons/icon-192.png",
        });
      }
    });
  }

  el.btnPipHud.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/launch-desktop-widget", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.launched) {
          showToast(
            "📌 Đã ghim Bảng Nhắc Việc & Đếm Ngược ra màn hình chính Laptop! (Vẫn hiển thị ngay cả khi thu nhỏ trình duyệt)"
          );
          return;
        }
      }
    } catch (err) {}

    try {
      if ("documentPictureInPicture" in window) {
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 385,
          height: 500,
        });
        state.pipWindow = pipWin;
        setupPipWindow(pipWin);
      } else {
        const popup = window.open(
          "",
          "SmartScheduleMiniHUD",
          "width=385,height=500,menubar=no,toolbar=no,location=no,status=no"
        );
        if (popup) {
          state.pipWindow = popup;
          setupPipWindow(popup);
        } else {
          showToast("Hãy cho phép mở cửa sổ Pop-up trên trình duyệt nhé!", "warning");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Không thể mở cửa sổ ghim nổi.", "warning");
    }
  });

  function setupPipWindow(win) {
    win.document.head.innerHTML = `
      <meta charset="UTF-8" />
      <title>Bảng Nhắc Việc & Đếm Ngược 🌿</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Quicksand:wght@600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="${window.location.origin}/static/css/style.css" />
      <style>
        body {
          font-family: 'Quicksand', 'Nunito', sans-serif;
          background: #f4fefb;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
      </style>
    `;
    updatePipWindowContent();
  }

  function updatePipWindowContent() {
    if (!state.pipWindow || state.pipWindow.closed) return;
    const doc = state.pipWindow.document;

    doc.body.innerHTML = `
      <div class="w-full min-h-screen bg-white/95 flex flex-col">
        <div class="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-3 text-teal-950 flex items-center justify-between select-none">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-lg">🔔</span>
            <div class="truncate">
              <h4 class="text-xs font-extrabold tracking-wide leading-tight">
                Bảng Nhắc Việc & Đếm Ngược
              </h4>
              <p class="text-[10px] font-semibold opacity-80 truncate">
                Đang ghim nổi trên màn hình Laptop 🌿
              </p>
            </div>
          </div>
        </div>
        <div id="pip-hud-body" class="p-3.5 space-y-3 flex-1 overflow-y-auto">
          ${el.hudBody.innerHTML}
        </div>
      </div>
    `;

    const pipBody = doc.getElementById("pip-hud-body");
    if (pipBody) {
      bindQuickEventActions(pipBody);
      const quickAdd = pipBody.querySelector("#btn-hud-quick-add");
      if (quickAdd) {
        quickAdd.addEventListener("click", () => {
          window.focus();
          openCreateEventModal();
        });
      }
    }
  }

  // ==========================================================================
  // 11. FULLCALENDAR INITIALIZATION & RESPONSIVE LOGIC
  // ==========================================================================
  function getResponsiveDefaultView() {
    return window.innerWidth < 768 ? "timeGridDay" : "timeGridWeek";
  }

  function highlightActiveViewButtons(viewType) {
    el.viewBtns.forEach((btn) => {
      const isMatch = btn.getAttribute("data-view") === viewType;
      if (isMatch) {
        btn.classList.add(
          "bg-gradient-to-r",
          "from-emerald-500",
          "to-teal-500",
          "text-teal-950",
          "shadow-xs"
        );
        btn.classList.remove("text-teal-700");
      } else {
        btn.classList.remove(
          "bg-gradient-to-r",
          "from-emerald-500",
          "to-teal-500",
          "text-teal-950",
          "shadow-xs"
        );
        btn.classList.add("text-teal-700");
      }
    });
  }

  function initCalendar() {
    const initialView = getResponsiveDefaultView();

    state.calendar = new FullCalendar.Calendar(el.calendarEl, {
      initialView: initialView,
      locale: "vi",
      firstDay: 1,
      headerToolbar: false,
      height: "100%",
      expandRows: true,
      stickyHeaderDates: true,
      nowIndicator: true,
      allDaySlot: false,
      slotMinTime: "01:00:00",
      slotMaxTime: "24:00:00",
      scrollTime: "07:00:00",
      slotDuration: "00:30:00",
      dayMaxEvents: 3,

      selectable: true,
      selectMirror: true,
      editable: true,
      eventStartEditable: true,
      eventDurationEditable: true,
      eventResizableFromStart: true,
      longPressDelay: 250,
      eventLongPressDelay: 250,
      selectLongPressDelay: 250,

      datesSet: (dateInfo) => {
        el.calendarTitle.textContent = dateInfo.view.title;
        highlightActiveViewButtons(dateInfo.view.type);
      },

      windowResize: () => {
        const isNowMobile = window.innerWidth < 768;
        if (isNowMobile !== state.wasMobile) {
          state.wasMobile = isNowMobile;
          const targetView = isNowMobile ? "timeGridDay" : "timeGridWeek";
          state.calendar.changeView(targetView);
          highlightActiveViewButtons(targetView);
        }
      },

      events: async (fetchInfo, successCallback, failureCallback) => {
        try {
          const params = new URLSearchParams({
            start: fetchInfo.startStr,
            end: fetchInfo.endStr,
          });
          if (state.selectedCategoryId !== null) {
            params.set("category_id", String(state.selectedCategoryId));
          }
          if (state.selectedStatus) {
            params.set("status", state.selectedStatus);
          }
          if (state.searchQuery.trim()) {
            params.set("search", state.searchQuery.trim());
          }

          const res = await fetch(`/api/events?${params.toString()}`);
          if (!res.ok) throw new Error("Failed to fetch events");
          const data = await res.json();
          isServerOffline = false;
          state.events = data;
          saveEventsToLocalBackup(data);

          updateSidebarStatsAndAgenda(data);
          renderCategoryControls();
          refreshAllTodoEvents();

          // Tách các công việc kéo dài nhiều ngày thành đúng khung giờ làm việc trong mỗi ngày
          const fcEvents = [];
          data.forEach((ev) => {
            fcEvents.push(...expandEventToCalendarSlices(ev));
          });

          successCallback(fcEvents);
        } catch (err) {
          console.warn("Using local backup while server is starting:", err);
          const backupData = loadEventsFromLocalBackup();
          state.events = backupData;
          updateSidebarStatsAndAgenda(backupData);
          renderCategoryControls();
          refreshAllTodoEvents();

          const fcEvents = [];
          backupData.forEach((ev) => {
            fcEvents.push(...expandEventToCalendarSlices(ev));
          });
          successCallback(fcEvents);

          if (!isServerOffline) {
            isServerOffline = true;
            showToast(
              "Máy chủ Python chưa bật — đang hiển thị dữ liệu lưu trữ trên máy. Hãy chạy run_app.py để đồng bộ!",
              "warning"
            );
          }
        }
      },

      eventContent: (arg) => {
        const ev = arg.event.extendedProps;
        const isDone = ev.status === "completed";
        const isRecurring = ev.recurrence_type && ev.recurrence_type !== "none";
        const catIcon = getEventEffectiveIcon(ev);
        const prio = getPriorityBadgeInfo(ev.priority);
        const attCount = (ev.attachments || []).length;
        const dayBadge =
          ev.totalDays && ev.totalDays > 1
            ? `<span class="bg-white/70 px-1 rounded text-[9px] font-extrabold">N${ev.dayIndex}/${ev.totalDays}</span>`
            : "";
        const prioIconBadge = prio.icon
          ? `<span class="bg-white/80 px-1 rounded text-[9px] font-extrabold">${prio.icon}</span>`
          : "";

        if (arg.view.type === "dayGridMonth") {
          return {
            html: `
              <div class="flex items-center justify-between gap-1 truncate px-1.5 py-0.5 text-[11px] font-extrabold">
                <span class="truncate">${
                  isDone ? "✓" : escapeHtml(catIcon)
                } <span class="fc-custom-title">${escapeHtml(
              arg.event.title
            )}</span></span>
                <span class="flex items-center gap-0.5 shrink-0">
                  ${prioIconBadge}
                  ${dayBadge}
                  ${
                    attCount > 0
                      ? `<span class="bg-white/65 px-1 rounded text-[9px]">📎${attCount}</span>`
                      : ""
                  }
                </span>
              </div>
            `,
          };
        }

        const cd = getEventCountdownInfo(ev);
        return {
          html: `
            <div class="flex flex-col h-full leading-tight p-0.5 overflow-hidden">
              <div class="flex items-center justify-between gap-1 text-[10px] opacity-95 font-bold">
                <span class="truncate">${escapeHtml(arg.timeText)}</span>
                <span class="shrink-0 flex items-center gap-0.5">
                  ${prioIconBadge}
                  ${dayBadge}
                  ${
                    attCount > 0
                      ? `<span class="bg-white/65 px-1 rounded-md text-[9px]" title="Có ${attCount} file đính kèm">📎${attCount}</span>`
                      : ""
                  }
                  ${isRecurring ? '<span title="Lịch lặp lại">🔁</span>' : ""}
                  ${
                    isDone
                      ? '<span class="bg-white/65 px-1 rounded-md text-[9px]">🍀 Xong</span>'
                      : ""
                  }
                </span>
              </div>
              <div class="fc-custom-title font-extrabold text-xs mt-0.5 line-clamp-2">
                ${escapeHtml(catIcon)} ${escapeHtml(arg.event.title)}
              </div>
              ${
                !isDone
                  ? `<div class="text-[10px] bg-white/65 px-1.5 py-0.2 rounded-full w-fit mt-0.5 font-extrabold truncate max-w-full">
                      ${escapeHtml(cd.shortText)}
                    </div>`
                  : ""
              }
            </div>
          `,
        };
      },

      select: (selectionInfo) => {
        let startDt = new Date(selectionInfo.start);
        let endDt = new Date(selectionInfo.end);

        if (selectionInfo.view.type === "dayGridMonth") {
          startDt.setHours(8, 0, 0, 0);
          endDt = new Date(startDt.getTime() + 2 * 60 * 60 * 1000);
        }

        openCreateEventModal(startDt, endDt);
        state.calendar.unselect();
      },

      eventClick: (clickInfo) => {
        const ev = clickInfo.event.extendedProps;
        openEditEventModal(ev);
      },

      eventDrop: async (dropInfo) => {
        await handleDragOrResizeUpdate(dropInfo);
      },

      eventResize: async (resizeInfo) => {
        await handleDragOrResizeUpdate(resizeInfo);
      },
    });

    state.calendar.render();
    highlightActiveViewButtons(initialView);
  }

  // ==========================================================================
  // 12. DRAG & DROP / RESIZE HANDLER (SUPPORTS MULTI-DAY DAILY WORKING HOURS)
  // ==========================================================================
  async function handleDragOrResizeUpdate(info) {
    const origEv = info.event.extendedProps;
    const eventId = origEv.id;

    const droppedStart = info.event.start;
    const droppedEnd =
      info.event.end || new Date(droppedStart.getTime() + 60 * 60 * 1000);

    // Nếu là sự kiện kéo dài nhiều ngày, khi kéo/giãn 1 ngày trên lịch sẽ cập nhật khung giờ làm việc mỗi ngày
    let newStartStr = toDatetimeLocalValue(droppedStart);
    let newEndStr = toDatetimeLocalValue(droppedEnd);

    if (origEv.totalDays && origEv.totalDays > 1) {
      const origStart = new Date(origEv.start_time);
      const origEnd = new Date(origEv.end_time);
      const startDatePart = toDateInputValue(origStart);
      const endDatePart = toDateInputValue(origEnd);
      const newDailyStartTime = toTimeInputValue(droppedStart);
      const newDailyEndTime = toTimeInputValue(droppedEnd);
      newStartStr = `${startDatePart}T${newDailyStartTime}`;
      newEndStr = `${endDatePart}T${newDailyEndTime}`;
    }

    const sendUpdate = async (force = false) => {
      try {
        const res = await fetch(
          `/api/events/${eventId}${force ? "?force=true" : ""}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              start_time: newStartStr,
              end_time: newEndStr,
              force: force,
            }),
          }
        );

        if (res.status === 409) {
          const conflictData = await res.json();
          openConflictModal(conflictData, {
            onForce: async () => {
              await sendUpdate(true);
            },
            onCancel: () => {
              info.revert();
              showToast("Đã hoàn tác thay đổi khung giờ.", "info");
            },
          });
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Lỗi cập nhật thời gian");
        }

        showToast("Đã cập nhật khung giờ làm việc! 🌿");
        state.calendar.refetchEvents();
        refreshAllTodoEvents();
      } catch (err) {
        info.revert();
        showToast(err.message || "Không thể cập nhật sự kiện.", "error");
      }
    };

    await sendUpdate(false);
  }

  // ==========================================================================
  // 13. CREATE / EDIT EVENT MODAL & DAILY WORKING TIME CALCULATOR
  // ==========================================================================
  function syncModalDateTimeInputs(source = "time") {
    const sDate = el.inputStartDate.value;
    let eDate = el.inputEndDate.value;
    if (sDate && eDate && eDate < sDate) {
      eDate = sDate;
      el.inputEndDate.value = eDate;
    }

    const sTime = el.inputDailyStartTime.value || "08:00";
    let eTime = el.inputDailyEndTime.value || "10:00";

    const [sh, sm] = sTime.split(":").map(Number);
    let [eh, em] = eTime.split(":").map(Number);
    const startTotalMins = sh * 60 + sm;

    if (source === "hours") {
      // Người dùng nhập số tiếng làm / 1 ngày -> tự động tính Giờ nghỉ mỗi ngày
      const hrsVal = Math.max(0.25, Math.min(23.5, parseFloat(el.inputDailyHours.value) || 1));
      const addMins = Math.round(hrsVal * 60);
      const targetEndMins = Math.min(23 * 60 + 59, startTotalMins + addMins);
      eh = Math.floor(targetEndMins / 60);
      em = targetEndMins % 60;
      eTime = `${pad(eh)}:${pad(em)}`;
      el.inputDailyEndTime.value = eTime;
    }

    let endTotalMins = eh * 60 + em;
    if (endTotalMins <= startTotalMins) {
      endTotalMins = Math.min(23 * 60 + 59, startTotalMins + 60);
      eh = Math.floor(endTotalMins / 60);
      em = endTotalMins % 60;
      eTime = `${pad(eh)}:${pad(em)}`;
      el.inputDailyEndTime.value = eTime;
    }

    const dailyDiffMins = endTotalMins - startTotalMins;
    const dailyHoursNum = +(dailyDiffMins / 60).toFixed(2);
    if (source !== "hours") {
      el.inputDailyHours.value = dailyHoursNum;
    }

    // Tính tổng số ngày thực hiện
    let daysCount = 1;
    if (sDate && eDate) {
      const sd = new Date(`${sDate}T00:00:00`);
      const ed = new Date(`${eDate}T00:00:00`);
      daysCount = Math.max(1, Math.round((ed - sd) / (24 * 60 * 60 * 1000)) + 1);
    }

    const dailyStr = formatDailyHoursLabel(dailyDiffMins);
    const totalHours = +(dailyHoursNum * daysCount).toFixed(1);
    el.dailyDurationSummary.textContent =
      daysCount > 1
        ? `⏳ Làm ${dailyStr} • ${daysCount} ngày (Tổng ${totalHours} giờ)`
        : `⏳ Làm ${dailyStr} (Trong 1 ngày)`;

    if (sDate && eDate) {
      el.inputStart.value = `${sDate}T${sTime}`;
      el.inputEnd.value = `${eDate}T${eTime}`;
    }
  }

  el.inputStartDate.addEventListener("change", () => syncModalDateTimeInputs("date"));
  el.inputEndDate.addEventListener("change", () => syncModalDateTimeInputs("date"));
  el.inputDailyStartTime.addEventListener("change", () => syncModalDateTimeInputs("hours"));
  el.inputDailyEndTime.addEventListener("change", () => syncModalDateTimeInputs("time"));
  el.inputDailyHours.addEventListener("input", () => syncModalDateTimeInputs("hours"));

  // Chọn nhanh khoảng ngày (Trong 1 ngày, 3 ngày, 5 ngày, 1 tuần)
  el.daysSpanChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const addDays = Number(chip.getAttribute("data-days-span") || 0);
      if (!el.inputStartDate.value) return;
      const sd = new Date(`${el.inputStartDate.value}T00:00:00`);
      const ed = new Date(sd.getTime() + addDays * 24 * 60 * 60 * 1000);
      el.inputEndDate.value = toDateInputValue(ed);
      syncModalDateTimeInputs("date");
    });
  });

  // Chọn nhanh thời lượng làm trong 1 ngày (30p/ngày, 1 giờ/ngày, 2 giờ/ngày, 3 giờ/ngày, 4 giờ/ngày)
  el.durationChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const minutes = Number(chip.getAttribute("data-duration") || 60);
      el.inputDailyHours.value = +(minutes / 60).toFixed(2);
      syncModalDateTimeInputs("hours");
    });
  });

  // Chọn nhanh Ca làm mẫu trong ngày (Sáng, Chiều, Tối)
  el.shiftChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const shift = chip.getAttribute("data-shift") || "08:00-11:00";
      const [st, et] = shift.split("-");
      el.inputDailyStartTime.value = st;
      el.inputDailyEndTime.value = et;
      syncModalDateTimeInputs("time");
    });
  });

  function openCreateEventModal(startDate, endDate) {
    const now = new Date();
    const defaultStart =
      startDate ||
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
    const defaultEnd =
      endDate || new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

    state.currentEditingEvent = null;
    state.pendingFiles = [];

    el.eventModalTitle.textContent = "🍀 Thêm công việc / lịch mới";
    el.modalCountdownBanner.classList.add("hidden");
    el.inputEventId.value = "";
    el.inputRecurrenceGroupId.value = "";
    el.inputTitle.value = "";

    el.inputStartDate.value = toDateInputValue(defaultStart);
    // Nếu chọn trên lịch 1 khoảng trong cùng ngày, endDate = startDate
    const adjEnd =
      defaultEnd.getHours() === 0 && defaultEnd.getMinutes() === 0
        ? new Date(defaultEnd.getTime() - 1000)
        : defaultEnd;
    el.inputEndDate.value = toDateInputValue(adjEnd);

    el.inputDailyStartTime.value = toTimeInputValue(defaultStart);
    const eTimeStr = toTimeInputValue(defaultEnd);
    el.inputDailyEndTime.value =
      eTimeStr <= el.inputDailyStartTime.value ? "10:00" : eTimeStr;

    syncModalDateTimeInputs("time");

    if (state.selectedCategoryId) {
      el.inputCategory.value = String(state.selectedCategoryId);
    } else if (state.categories.length > 0) {
      el.inputCategory.value = String(state.categories[0].id);
    }

    // Tự động chọn sẵn 1 màu Pastel phân biệt với công việc trước đó
    const nextColor =
      DISTINCT_PASTEL_COLORS[state.events.length % DISTINCT_PASTEL_COLORS.length];
    highlightActiveColorSwatch(nextColor);
    if (el.inputPriority) el.inputPriority.value = "normal";
    if (el.inputCustomIcon) el.inputCustomIcon.value = "";

    el.inputStatus.value = "pending";
    el.inputRecurrence.value = "none";
    const defaultUntil = new Date(defaultStart.getTime() + 28 * 24 * 60 * 60 * 1000);
    el.inputRecurrenceUntil.value = toDateInputValue(defaultUntil);
    toggleRecurrenceUntilUI();

    el.inputLocation.value = "";
    el.inputNotes.value = "";

    renderModalAttachments();

    el.btnDeleteEvent.classList.add("hidden");
    el.btnDeleteSeries.classList.add("hidden");

    el.eventModal.classList.remove("hidden");
    el.eventModal.classList.add("flex");
    setTimeout(() => el.inputTitle.focus(), 50);
  }

  function openEditEventModal(ev) {
    state.currentEditingEvent = {
      ...ev,
      attachments: [...(ev.attachments || [])],
    };
    state.pendingFiles = [];

    el.eventModalTitle.textContent = "🌿 Chi tiết & Cài đặt Giờ làm trong ngày";
    el.modalCountdownBanner.classList.remove("hidden");
    const cd = getEventCountdownInfo(ev);
    el.modalCountdownLabel.textContent = cd.label;
    el.modalCountdownTimer.textContent = cd.timerText;

    el.inputEventId.value = String(ev.id);
    el.inputRecurrenceGroupId.value = ev.recurrence_group_id || "";
    el.inputTitle.value = ev.title || "";

    el.inputStartDate.value = toDateInputValue(ev.start_time);
    el.inputEndDate.value = toDateInputValue(ev.end_time);
    el.inputDailyStartTime.value = toTimeInputValue(ev.start_time);
    el.inputDailyEndTime.value = toTimeInputValue(ev.end_time);
    syncModalDateTimeInputs("time");

    if (ev.category_id) {
      el.inputCategory.value = String(ev.category_id);
    }
    highlightActiveColorSwatch(getEventEffectiveColor(ev));
    if (el.inputPriority) el.inputPriority.value = ev.priority || "normal";
    if (el.inputCustomIcon) el.inputCustomIcon.value = ev.custom_icon || "";

    el.inputStatus.value = ev.status || "pending";
    el.inputRecurrence.value = ev.recurrence_type || "none";
    el.inputRecurrenceUntil.value = ev.recurrence_until
      ? toDateInputValue(ev.recurrence_until)
      : "";
    toggleRecurrenceUntilUI();

    el.inputLocation.value = ev.location || "";
    el.inputNotes.value = ev.notes || "";

    renderModalAttachments();

    el.btnDeleteEvent.classList.remove("hidden");
    if (ev.recurrence_group_id) {
      el.btnDeleteSeries.classList.remove("hidden");
    } else {
      el.btnDeleteSeries.classList.add("hidden");
    }

    el.eventModal.classList.remove("hidden");
    el.eventModal.classList.add("flex");
  }

  function closeEventModal() {
    el.eventModal.classList.add("hidden");
    el.eventModal.classList.remove("flex");
    state.currentEditingEvent = null;
    state.pendingFiles = [];
  }

  function toggleRecurrenceUntilUI() {
    const recType = el.inputRecurrence.value;
    if (recType === "daily" || recType === "weekly") {
      el.recurrenceUntilWrapper.classList.remove("hidden");
      el.recurrenceHint.classList.remove("hidden");
      if (!el.inputRecurrenceUntil.value && el.inputStartDate.value) {
        const startDt = new Date(`${el.inputStartDate.value}T00:00:00`);
        const addDays = recType === "daily" ? 7 : 28;
        const untilDt = new Date(startDt.getTime() + addDays * 24 * 60 * 60 * 1000);
        el.inputRecurrenceUntil.value = toDateInputValue(untilDt);
      }
    } else {
      el.recurrenceUntilWrapper.classList.add("hidden");
      el.recurrenceHint.classList.add("hidden");
    }
  }

  el.inputRecurrence.addEventListener("change", toggleRecurrenceUntilUI);

  el.eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitEventForm(false);
  });

  async function submitEventForm(force = false) {
    syncModalDateTimeInputs("time");
    const eventId = el.inputEventId.value.trim();
    const isEdit = Boolean(eventId);

    const startVal = el.inputStart.value;
    const endVal = el.inputEnd.value;

    if (el.inputDailyEndTime.value <= el.inputDailyStartTime.value) {
      showToast("Trong 1 ngày, giờ nghỉ phải lớn hơn giờ bắt đầu làm việc!", "warning");
      return;
    }

    if (el.inputEndDate.value < el.inputStartDate.value) {
      showToast("Ngày kết thúc không được nhỏ hơn ngày bắt đầu!", "warning");
      return;
    }

    const recType = el.inputRecurrence.value;
    const recUntilVal =
      recType !== "none" && el.inputRecurrenceUntil.value
        ? `${el.inputRecurrenceUntil.value}T23:59:59`
        : null;

    const payload = {
      title: el.inputTitle.value.trim(),
      start_time: startVal,
      end_time: endVal,
      category_id: el.inputCategory.value ? Number(el.inputCategory.value) : null,
      status: el.inputStatus.value,
      custom_color: el.inputCustomColor ? el.inputCustomColor.value : null,
      custom_icon: el.inputCustomIcon ? el.inputCustomIcon.value.trim() : null,
      priority: el.inputPriority ? el.inputPriority.value : "normal",
      recurrence_type: recType,
      recurrence_until: recUntilVal,
      location: el.inputLocation.value.trim(),
      notes: el.inputNotes.value.trim(),
      force: force,
      attachments_data: state.pendingFiles.length > 0 ? state.pendingFiles : null,
    };

    const url = isEdit
      ? `/api/events/${eventId}${force ? "?force=true" : ""}`
      : `/api/events${force ? "?force=true" : ""}`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const conflictData = await res.json();
        openConflictModal(conflictData, {
          onForce: async () => {
            await submitEventForm(true);
          },
          onCancel: () => {},
        });
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Không thể lưu sự kiện.");
      }

      if (payload.status === "completed") {
        spawnCuteConfetti();
      }

      closeEventModal();
      state.calendar.refetchEvents();
      await refreshAllTodoEvents();
      showToast(
        isEdit
          ? "Đã cập nhật thời gian làm việc mỗi ngày & tài liệu! 🌿"
          : "Đã thêm công việc mới vào lịch! 🍀"
      );
    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra khi lưu sự kiện.", "error");
    }
  }

  async function handleDeleteEvent(deleteSeries = false) {
    const eventId = el.inputEventId.value.trim();
    if (!eventId) return;

    const confirmMsg = deleteSeries
      ? "Bạn có chắc chắn muốn xóa TOÀN BỘ các buổi trong chuỗi lặp lại này?"
      : "Bạn có chắc chắn muốn xóa công việc này?";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(
        `/api/events/${eventId}?delete_series=${deleteSeries ? "true" : "false"}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Không thể xóa sự kiện.");
      const data = await res.json();
      closeEventModal();
      state.calendar.refetchEvents();
      await refreshAllTodoEvents();
      showToast(data.message || "Đã xóa sự kiện.");
    } catch (err) {
      showToast(err.message || "Lỗi khi xóa sự kiện.", "error");
    }
  }

  el.btnDeleteEvent.addEventListener("click", () => handleDeleteEvent(false));
  el.btnDeleteSeries.addEventListener("click", () => handleDeleteEvent(true));

  // ==========================================================================
  // 14. SMART CONFLICT WARNING MODAL
  // ==========================================================================
  function openConflictModal(conflictData, callbacks) {
    state.pendingConflictAction = callbacks;
    const items = conflictData.conflicting_events || [];

    el.conflictEventsList.innerHTML = items
      .map(
        (item) => `
        <div class="p-3 rounded-2xl bg-amber-50/80 border-2 border-amber-200 flex items-start gap-2.5">
          <span
            class="w-3.5 h-3.5 rounded-full shrink-0 mt-1"
            style="background-color: ${escapeHtml(item.category_color || "#A7F3D0")}"
          ></span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-extrabold text-teal-950 truncate">${escapeHtml(
                item.title
              )}</p>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-teal-700 border border-emerald-200 shrink-0">
                ${escapeHtml(item.category_name || "Sự kiện")}
              </span>
            </div>
            <p class="text-xs text-amber-800 font-bold mt-0.5">
              🕒 ${formatTimeRange(item.start_time, item.end_time)}
            </p>
          </div>
        </div>
      `
      )
      .join("");

    el.conflictModal.classList.remove("hidden");
    el.conflictModal.classList.add("flex");
  }

  function closeConflictModal() {
    el.conflictModal.classList.add("hidden");
    el.conflictModal.classList.remove("flex");
  }

  el.btnConflictCancel.addEventListener("click", () => {
    const action = state.pendingConflictAction;
    state.pendingConflictAction = null;
    closeConflictModal();
    if (action && typeof action.onCancel === "function") {
      action.onCancel();
    }
  });

  el.btnConflictForce.addEventListener("click", async () => {
    const action = state.pendingConflictAction;
    state.pendingConflictAction = null;
    closeConflictModal();
    if (action && typeof action.onForce === "function") {
      await action.onForce();
    }
  });

  // ==========================================================================
  // 15. CATEGORY CREATION MODAL
  // ==========================================================================
  function openCategoryModal() {
    el.inputCatName.value = "";
    el.inputCatIcon.value = "🌿";
    el.inputCatColor.value = "#A7F3D0";
    el.categoryModal.classList.remove("hidden");
    el.categoryModal.classList.add("flex");
    setTimeout(() => el.inputCatName.focus(), 50);
  }

  function closeCategoryModal() {
    el.categoryModal.classList.add("hidden");
    el.categoryModal.classList.remove("flex");
  }

  el.btnOpenCategoryModal.addEventListener("click", openCategoryModal);
  el.btnCloseCategoryModal.addEventListener("click", closeCategoryModal);
  el.btnCancelCategory.addEventListener("click", closeCategoryModal);

  el.categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = el.inputCatName.value.trim();
    const icon = el.inputCatIcon.value.trim() || "🌿";
    const color = el.inputCatColor.value;
    if (!name) return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon, color }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Không thể tạo danh mục.");
      }

      closeCategoryModal();
      await loadCategories();
      showToast(`Đã thêm danh mục "${name}"! 🌿`);
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // ==========================================================================
  // 16. TOOLBAR, SEARCH & DRAWER EVENT LISTENERS
  // ==========================================================================
  el.btnToday.addEventListener("click", () => state.calendar.today());
  el.btnPrev.addEventListener("click", () => state.calendar.prev());
  el.btnNext.addEventListener("click", () => state.calendar.next());

  el.viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetView = btn.getAttribute("data-view");
      if (targetView && state.calendar) {
        state.calendar.changeView(targetView);
        highlightActiveViewButtons(targetView);
      }
    });
  });

  el.statusFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedStatus = btn.getAttribute("data-status") || "";
      el.statusFilterBtns.forEach((b) => {
        if (b === btn) {
          b.classList.add("bg-white", "text-emerald-700", "shadow-xs");
          b.classList.remove("text-teal-700");
        } else {
          b.classList.remove("bg-white", "text-emerald-700", "shadow-xs");
          b.classList.add("text-teal-700");
        }
      });
      state.calendar.refetchEvents();
    });
  });

  let searchTimer = null;
  function handleSearchChange(val) {
    state.searchQuery = val;
    if (el.searchInput && el.searchInput.value !== val) el.searchInput.value = val;
    if (el.mobileSearchInput && el.mobileSearchInput.value !== val) {
      el.mobileSearchInput.value = val;
    }
    if (el.btnClearSearch) {
      el.btnClearSearch.classList.toggle("hidden", !val);
    }
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.calendar.refetchEvents();
    }, 240);
  }

  if (el.searchInput) {
    el.searchInput.addEventListener("input", (e) => handleSearchChange(e.target.value));
  }
  if (el.mobileSearchInput) {
    el.mobileSearchInput.addEventListener("input", (e) =>
      handleSearchChange(e.target.value)
    );
  }
  if (el.btnClearSearch) {
    el.btnClearSearch.addEventListener("click", () => handleSearchChange(""));
  }

  function openMobileSidebar() {
    el.sidebar.classList.remove("-translate-x-full");
    el.sidebarBackdrop.classList.remove("hidden");
  }

  function closeMobileSidebar() {
    el.sidebar.classList.add("-translate-x-full");
    el.sidebarBackdrop.classList.add("hidden");
  }

  el.btnToggleSidebar.addEventListener("click", openMobileSidebar);
  el.btnCloseSidebar.addEventListener("click", closeMobileSidebar);
  el.sidebarBackdrop.addEventListener("click", closeMobileSidebar);

  el.btnAddEvent.addEventListener("click", () => openCreateEventModal());
  el.fabAddEvent.addEventListener("click", () => openCreateEventModal());
  el.btnCloseEventModal.addEventListener("click", closeEventModal);
  el.btnCancelEvent.addEventListener("click", closeEventModal);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el.filePreviewModal.classList.contains("hidden")) {
        closeFilePreviewModal();
      } else if (!el.conflictModal.classList.contains("hidden")) {
        el.btnConflictCancel.click();
      } else if (!el.categoryModal.classList.contains("hidden")) {
        closeCategoryModal();
      } else if (!el.eventModal.classList.contains("hidden")) {
        closeEventModal();
      }
    }
  });

  // ==========================================================================
  // 17. PWA SERVICE WORKER & INSTALL PROMPT
  // ==========================================================================
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("SW registration skipped:", err));
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredInstallPrompt = e;
    el.btnInstallPwa.classList.remove("hidden");
    el.btnInstallPwa.classList.add("flex");
  });

  el.btnInstallPwa.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    const { outcome } = await state.deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      el.btnInstallPwa.classList.add("hidden");
      showToast("Đã cài đặt SmartSchedule ra màn hình chính! 🌿");
    }
    state.deferredInstallPrompt = null;
  });

  // Tự động kiểm tra và kết nối lại ngay khi máy chủ Python được bật lên
  setInterval(async () => {
    if (!isServerOffline) return;
    try {
      const res = await fetch("/health");
      if (res.ok) {
        isServerOffline = false;
        showToast("🍀 Đã kết nối máy chủ thành công! Đang đồng bộ lịch...");
        await loadCategories();
        if (state.calendar) state.calendar.refetchEvents();
        await refreshAllTodoEvents();
      }
    } catch (e) {}
  }, 3000);

  // ==========================================================================
  // 18. BOOTSTRAP APPLICATION
  // ==========================================================================
  (async function bootstrap() {
    tickEverySecond();
    await loadCategories();
    initCalendar();
    await refreshAllTodoEvents();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("action") === "new") {
      openCreateEventModal();
    }
  })();
});
