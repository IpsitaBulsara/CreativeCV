/**
 * IPSITA'S JOURNAL CV — INTERACTIVE 3D FLIPBOOK ENGINE
 * Pure Vanilla JavaScript ES6 App with Web Audio API & Gesture Controls
 */

class JournalApp {
  constructor() {
    this.totalLeaves = 9;
    this.flipped = 0;
    this.topLeaf = -1;
    this.isFlipping = false;
    this.soundEnabled = localStorage.getItem('journal_sound') !== 'false';
    this.autoplayTimer = null;
    this.autoplayIntervalMs = 6000;

    // Page Spread Labels for Indicator
    this.labels = [
      'Cover',
      'Pages 2 – 3 · About Me',
      'Pages 4 – 5 · What Pulls Me In',
      'Pages 6 – 7 · Beauty & Nature',
      'Pages 8 – 9 · Brand & Strengths',
      'Pages 10 – 11 · Growth Edges',
      'Pages 12 – 13 · The Unfamiliar',
      'Pages 14 – 15 · Moments',
      'Pages 16 – 17 · Making',
      'Page 18 · Fin.'
    ];

    // DOM Elements Cache
    this.scaler = document.getElementById('book-scaler');
    this.leaves = Array.from({ length: this.totalLeaves }, (_, i) => document.getElementById(`leaf-${i}`));
    this.counterBadge = document.getElementById('page-counter-badge');
    this.timelineProgress = document.getElementById('timeline-progress');
    this.timeNodes = document.querySelectorAll('.time-node');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnSound = document.getElementById('btn-sound');
    this.btnAutoplay = document.getElementById('btn-autoplay');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnToc = document.getElementById('btn-toc');
    this.btnCloseToc = document.getElementById('btn-close-toc');
    this.tocDrawer = document.getElementById('toc-drawer');
    this.tocBackdrop = document.getElementById('toc-backdrop');
    this.tocItems = document.querySelectorAll('.toc-item');
    this.photoModal = document.getElementById('photo-modal');
    this.modalImg = document.getElementById('modal-img');
    this.modalCaption = document.getElementById('modal-caption');
    this.modalNote = document.getElementById('modal-note');
    this.modalClose = document.getElementById('modal-close');

    // Web Audio Synthesizer Context
    this.audioCtx = null;

    this.init();
  }

  init() {
    this.setupAudio();
    this.setupResizeScaling();
    this.setupNavigationEvents();
    this.setupKeyboardEvents();
    this.setupTouchGestures();
    this.setupDrawerAndModal();
    this.updateBookState(false);
  }

  /* --------------------------------------------------------------------------
     Procedural Paper Rustle Synthesizer (Web Audio API)
     -------------------------------------------------------------------------- */
  setupAudio() {
    this.updateSoundBtnUI();

    const initAudioContext = () => {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    };

    window.addEventListener('click', initAudioContext, { once: true });
    window.addEventListener('keydown', initAudioContext, { once: true });
    window.addEventListener('touchstart', initAudioContext, { once: true });
  }

  playPageTurnSound() {
    if (!this.soundEnabled) return;
    
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const duration = 0.45;

      // 1. Synthesize Brown/Pink filtered noise buffer for realistic paper friction
      const bufferSize = this.audioCtx.sampleRate * duration;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02; // soft Brownian noise
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const noiseSource = this.audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // 2. Dynamic Bandpass sweep representing the paper leaf moving through air
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(320, now + duration);
      filter.Q.setValueAtTime(1.8, now);

      // 3. Gain Envelope (Swish in -> Rustle -> Whisper settling)
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.24, now + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.28);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch (err) {
      console.warn('Audio play error:', err);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('journal_sound', String(this.soundEnabled));
    this.updateSoundBtnUI();
    if (this.soundEnabled) this.playPageTurnSound();
  }

  updateSoundBtnUI() {
    if (this.btnSound) {
      this.btnSound.classList.toggle('active', this.soundEnabled);
      this.btnSound.setAttribute('aria-pressed', String(this.soundEnabled));
    }
  }

  /* --------------------------------------------------------------------------
     Responsive Scaler Math (Fit to Page)
     -------------------------------------------------------------------------- */
  setupResizeScaling() {
    const stage = document.getElementById('stage-container');
    const handleFit = () => {
      if (!this.scaler || !stage) return;
      
      const stageW = stage.clientWidth;
      const stageH = stage.clientHeight;
      
      // Target book dimensions including 3D leather margins
      const targetW = 1564;
      const targetH = 1096;
      
      const scaleX = (stageW - 12) / targetW;
      const scaleY = (stageH - 12) / targetH;
      const scale = Math.min(scaleX, scaleY);
      
      // Scale smoothly so book fits entirely within viewport without overflow
      const finalScale = Math.max(0.2, Math.min(1.05, scale));
      this.scaler.style.transform = `scale(${finalScale})`;
      this.scaler.style.transformOrigin = 'center center';
    };

    handleFit();
    window.addEventListener('resize', handleFit);
    window.addEventListener('orientationchange', handleFit);
    if (window.ResizeObserver && stage) {
      new ResizeObserver(handleFit).observe(stage);
    }
  }

  /* --------------------------------------------------------------------------
     Flip Engine & 3D Depth State
     -------------------------------------------------------------------------- */
  flip(delta) {
    const target = this.flipped + delta;
    if (target < 0 || target > this.totalLeaves || this.isFlipping) return;

    this.isFlipping = true;
    this.topLeaf = delta > 0 ? target - 1 : target;
    this.flipped = target;

    this.playPageTurnSound();
    this.updateBookState(true);

    setTimeout(() => {
      this.isFlipping = false;
      this.updateBookState(false);
    }, 1150);
  }

  jumpTo(leafIndex) {
    if (leafIndex < 0 || leafIndex > this.totalLeaves || leafIndex === this.flipped || this.isFlipping) return;
    
    this.isFlipping = true;
    const delta = leafIndex - this.flipped;
    this.topLeaf = delta > 0 ? leafIndex - 1 : leafIndex;
    this.flipped = leafIndex;

    this.playPageTurnSound();
    this.updateBookState(true);

    setTimeout(() => {
      this.isFlipping = false;
      this.updateBookState(false);
    }, 1150);
  }

  updateBookState(isTurning) {
    const N = this.totalLeaves;

    // Apply 3D Rotation & Z-Index to each leaf
    this.leaves.forEach((leaf, i) => {
      if (!leaf) return;
      const isFlipped = i < this.flipped;

      leaf.style.transform = isFlipped ? 'rotateY(-180deg)' : 'rotateY(0deg)';

      if (isTurning && i === this.topLeaf) {
        leaf.style.zIndex = 100;
      } else {
        leaf.style.zIndex = isFlipped ? N + i : N - i;
      }

      // Only the two currently-visible faces should be interactive.
      // backface-visibility:hidden only hides painting, not hit-testing,
      // so rotated-away faces can otherwise steal clicks from the visible page.
      const frontFace = leaf.querySelector('.face-front');
      const backFace = leaf.querySelector('.face-back');
      if (frontFace) frontFace.style.pointerEvents = i === this.flipped ? 'auto' : 'none';
      if (backFace) backFace.style.pointerEvents = i === this.flipped - 1 ? 'auto' : 'none';
    });

    // Update Counter Badge
    if (this.counterBadge) {
      this.counterBadge.textContent = this.labels[this.flipped] || `Page ${this.flipped * 2}`;
    }

    // Update Timeline Progress Bar
    if (this.timelineProgress) {
      const pct = (this.flipped / N) * 100;
      this.timelineProgress.style.width = `${pct}%`;
    }

    // Update Node Dots
    this.timeNodes.forEach((node, i) => {
      node.classList.toggle('active', i === this.flipped);
    });

    // Update Table of Contents Selected
    this.tocItems.forEach((item, i) => {
      item.classList.toggle('active', i === this.flipped);
    });

    // Update Button Disabled States
    if (this.btnPrev) this.btnPrev.disabled = this.flipped === 0;
    if (this.btnNext) this.btnNext.disabled = this.flipped === N;
  }

  /* --------------------------------------------------------------------------
     Navigation & Event Handlers
     -------------------------------------------------------------------------- */
  setupNavigationEvents() {
    if (this.btnPrev) this.btnPrev.addEventListener('click', () => this.flip(-1));
    if (this.btnNext) this.btnNext.addEventListener('click', () => this.flip(1));

    // Page Click Zones (Left / Right Click)
    const zonePrev = document.getElementById('zone-prev');
    const zoneNext = document.getElementById('zone-next');
    if (zonePrev) zonePrev.addEventListener('click', () => this.flip(-1));
    if (zoneNext) zoneNext.addEventListener('click', () => this.flip(1));

    // Timeline Dot Nodes
    this.timeNodes.forEach((node) => {
      node.addEventListener('click', (e) => {
        const targetFlip = parseInt(e.currentTarget.getAttribute('data-flip'), 10);
        this.jumpTo(targetFlip);
      });
    });

    // Sound Button
    if (this.btnSound) this.btnSound.addEventListener('click', () => this.toggleSound());

    // Autoplay Button
    if (this.btnAutoplay) this.btnAutoplay.addEventListener('click', () => this.toggleAutoplay());

    // Fullscreen Button
    if (this.btnFullscreen) this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
  }

  /* --------------------------------------------------------------------------
     Keyboard Shortcuts
     -------------------------------------------------------------------------- */
  setupKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      // Ignore when typing inside input / textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          this.flip(1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          this.flip(-1);
          break;
        case 'Home':
          e.preventDefault();
          this.jumpTo(0);
          break;
        case 'End':
          e.preventDefault();
          this.jumpTo(this.totalLeaves);
          break;
        case 'm':
        case 'M':
          this.toggleSound();
          break;
        case 'p':
        case 'P':
          this.toggleAutoplay();
          break;
        case 'f':
        case 'F':
          this.toggleFullscreen();
          break;
        case 'Escape':
          this.closeDrawer();
          this.closeModal();
          break;
      }
    });
  }

  /* --------------------------------------------------------------------------
     Touch & Mobile Swipe Gestures
     -------------------------------------------------------------------------- */
  setupTouchGestures() {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const stage = document.getElementById('stage-container');
    if (!stage) return;

    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }
    }, { passive: true });

    stage.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const distX = endX - startX;
        const distY = endY - startY;
        const elapsed = Date.now() - startTime;

        // Ensure horizontal swipe
        if (Math.abs(distX) > 45 && Math.abs(distX) > Math.abs(distY) * 1.4 && elapsed < 600) {
          if (distX < 0) {
            this.flip(1); // Swipe Left -> Next
          } else {
            this.flip(-1); // Swipe Right -> Prev
          }
        }
      }
    }, { passive: true });
  }

  /* --------------------------------------------------------------------------
     Table of Contents & Photo Modal
     -------------------------------------------------------------------------- */
  setupDrawerAndModal() {
    // TOC Drawer
    if (this.btnToc) this.btnToc.addEventListener('click', () => this.openDrawer());
    if (this.btnCloseToc) this.btnCloseToc.addEventListener('click', () => this.closeDrawer());
    if (this.tocBackdrop) this.tocBackdrop.addEventListener('click', () => this.closeDrawer());

    this.tocItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const flipIdx = parseInt(item.getAttribute('data-flip'), 10);
        this.jumpTo(flipIdx);
        this.closeDrawer();
      });
    });

    // Polaroid Frames Photo Zoom
    const polaroids = document.querySelectorAll('.polaroid-frame');
    polaroids.forEach((frame) => {
      frame.addEventListener('click', (e) => {
        e.stopPropagation();
        const photoSrc = frame.getAttribute('data-photo');
        const caption = frame.getAttribute('data-caption') || '';
        const note = frame.getAttribute('data-note') || '';
        this.openModal(photoSrc, caption, note);
      });
    });

    if (this.modalClose) this.modalClose.addEventListener('click', () => this.closeModal());
    if (this.photoModal) {
      this.photoModal.addEventListener('click', (e) => {
        if (e.target === this.photoModal) this.closeModal();
      });
    }
  }

  openDrawer() {
    if (this.tocDrawer && this.tocBackdrop) {
      this.tocDrawer.classList.add('open');
      this.tocBackdrop.classList.add('open');
      this.tocDrawer.setAttribute('aria-hidden', 'false');
    }
  }

  closeDrawer() {
    if (this.tocDrawer && this.tocBackdrop) {
      this.tocDrawer.classList.remove('open');
      this.tocBackdrop.classList.remove('open');
      this.tocDrawer.setAttribute('aria-hidden', 'true');
    }
  }

  openModal(src, caption, note) {
    if (this.photoModal && this.modalImg) {
      this.modalImg.src = src;
      if (this.modalCaption) this.modalCaption.textContent = caption;
      if (this.modalNote) this.modalNote.textContent = note;
      this.photoModal.classList.add('open');
      this.photoModal.setAttribute('aria-hidden', 'false');
    }
  }

  closeModal() {
    if (this.photoModal) {
      this.photoModal.classList.remove('open');
      this.photoModal.setAttribute('aria-hidden', 'true');
    }
  }

  /* --------------------------------------------------------------------------
     Autoplay & Fullscreen Modes
     -------------------------------------------------------------------------- */
  toggleAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
      if (this.btnAutoplay) this.btnAutoplay.classList.remove('playing');
    } else {
      if (this.flipped >= this.totalLeaves) this.jumpTo(0);
      if (this.btnAutoplay) this.btnAutoplay.classList.add('playing');
      
      this.autoplayTimer = setInterval(() => {
        if (this.flipped >= this.totalLeaves) {
          this.toggleAutoplay();
        } else {
          this.flip(1);
        }
      }, this.autoplayIntervalMs);
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request denied:', err);
      });
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }
}

// Instantiate application once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.journalApp = new JournalApp();
});
