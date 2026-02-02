/**
 * Standalone Counters Component with Carousel
 * Integrates with Streamer.bot for real-time counter data and carousel display
 */

class CountersComponent {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.config = {
            counter1: {
                valueVariable: 'counter1',
                labelVariable: 'counter1label',
                toggleVariable: 'counter1toggle',
                defaultValue: 0,
                defaultLabel: 'Counter 1',
                defaultVisible: true
            },
            counter2: {
                valueVariable: 'counter2',
                labelVariable: 'counter2label',
                toggleVariable: 'counter2toggle',
                defaultValue: 0,
                defaultLabel: 'Counter 2',
                defaultVisible: true
            },
            counter3: {
                valueVariable: 'counter3',
                labelVariable: 'counter3label',
                toggleVariable: 'counter3toggle',
                defaultValue: 0,
                defaultLabel: 'Counter 3',
                defaultVisible: true
            },
            counter4: {
                valueVariable: 'counter4',
                labelVariable: 'counter4label',
                toggleVariable: 'counter4toggle',
                defaultValue: 0,
                defaultLabel: 'Counter 4',
                defaultVisible: true
            }
        };

        // Initialize CarouselManager
        this.CarouselManager = this.createCarouselManager();

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log('🔢 Counters Component initializing...');

        // Set defaults
        this.setDefaults();

        // Initialize carousel system
        setTimeout(() => {
            this.CarouselManager.init();
        }, 1000);

        // Connect to Streamer.bot
        this.connectToStreamerbot();

        // Set up debug functions
        this.setupDebugFunctions();

        console.log('🔢 Counters Component initialized successfully');
    }

    setDefaults() {
        // Set counter defaults
        Object.keys(this.config).forEach(counterId => {
            const config = this.config[counterId];
            const counterElement = document.getElementById(`counter-${counterId}`);
            const labelElement = document.getElementById(`${counterId}-label`);

            if (counterElement) {
                counterElement.textContent = config.defaultValue;
            }
            if (labelElement) {
                labelElement.textContent = config.defaultLabel;
            }
        });
    }

    connectToStreamerbot() {
        // Check for both possible exports
        const ClientClass = typeof StreamerbotClient !== 'undefined' ? StreamerbotClient :
                           typeof Streamerbot !== 'undefined' && Streamerbot.Client ? Streamerbot.Client : null;

        if (!ClientClass) {
            console.error('🔢 Streamer.bot client not found. Make sure streamerbot-client.js is loaded.');
            this.enableTestMode();
            return;
        }

        try {
            // Configure Streamer.bot client
            const config = {
                host: '127.0.0.1',
                port: 8080,
                endpoint: '/',
                immediate: false,
                autoReconnect: true,
                retries: 5,
                retryInterval: 2000
            };

            console.log('🔢 Creating client with config:', config);

            // Create and initialize client
            this.client = new ClientClass(config);

            // Set up event handlers
            this.setupEventHandlers();

            // Connect to Streamer.bot
            this.client.connect();

            console.log('🔢 Connecting to Streamer.bot...');

            // Add connection timeout
            setTimeout(() => {
                if (!this.isConnected) {
                    console.warn('🔢 Connection timeout after 10 seconds - enabling test mode');
                    this.enableTestMode();
                }
            }, 10000);

        } catch (error) {
            console.error('🔢 Failed to connect to Streamer.bot:', error);
            this.enableTestMode();
        }
    }

    setupEventHandlers() {
        if (!this.client) return;

        // Connection events
        this.client.on('WebsocketClient.Open', () => {
            this.isConnected = true;
            console.log('🔢 Connected to Streamer.bot successfully');
            this.requestInitialData();
        });

        this.client.on('WebsocketClient.Close', (event) => {
            this.isConnected = false;
            console.log('🔢 Disconnected from Streamer.bot');
        });

        // Global variable events for counter updates
        this.client.on('Misc.GlobalVariableUpdated', (data) => {
            try {
                const variableName = data.name;
                const variableValue = data.newValue;

                if (variableName && variableValue !== undefined) {
                    console.log('🔢 GlobalVariableUpdated:', variableName, '=', variableValue);
                    this.updateCounterFromGlobalVariable(variableName, variableValue);
                }
            } catch (error) {
                console.error('🔢 Error processing global variable update:', error);
            }
        });
    }

    async requestInitialData() {
        if (!this.client || !this.isConnected) return;

        console.log('🔢 Requesting initial counter data...');

        // Request all counter-related variables
        const variables = [];
        Object.keys(this.config).forEach(counterId => {
            const config = this.config[counterId];
            variables.push(config.valueVariable, config.labelVariable, config.toggleVariable);
        });

        for (const variable of variables) {
            try {
                const response = await this.client.getGlobal(variable);
                if (response && response.variable !== undefined) {
                    console.log(`🔢 Got initial ${variable} =`, response.variable);
                    this.updateCounterFromGlobalVariable(variable, response.variable);
                }
            } catch (error) {
                console.warn(`🔢 Failed to get initial ${variable}:`, error);
            }
        }
    }

    updateCounterFromGlobalVariable(variableName, variableValue) {
        // Find which counter this variable belongs to
        Object.keys(this.config).forEach(counterId => {
            const config = this.config[counterId];

            if (variableName === config.valueVariable) {
                this.updateCounterValue(counterId, variableValue);
            } else if (variableName === config.labelVariable) {
                this.updateCounterLabel(counterId, variableValue);
            } else if (variableName === config.toggleVariable) {
                this.setCounterVisibility(counterId, variableValue);
            }
        });
    }

    updateCounterValue(counterId, value) {
        const displayValue = value === undefined || value === null || value === 'undefined' ? '0' : String(value);
        const counterElement = document.getElementById(`counter-${counterId}`);

        if (counterElement) {
            counterElement.textContent = displayValue;
            console.log(`🔢 Updated ${counterId} value: ${displayValue}`);

            // Sync with carousel
            this.CarouselManager.syncData(this.config[counterId].valueVariable, value);
        }
    }

    updateCounterLabel(counterId, label) {
        const displayLabel = label || this.config[counterId].defaultLabel;
        const labelElement = document.getElementById(`${counterId}-label`);

        if (labelElement) {
            labelElement.textContent = displayLabel;
            console.log(`🔢 Updated ${counterId} label: ${displayLabel}`);

            // Sync with carousel
            this.CarouselManager.syncData(this.config[counterId].labelVariable, label);
        }
    }

    setCounterVisibility(counterId, visible) {
        // Parse boolean from various formats
        let isVisible = true;
        if (typeof visible === 'boolean') {
            isVisible = visible;
        } else if (typeof visible === 'string') {
            isVisible = visible.toLowerCase() !== 'false' && visible !== '0' && visible !== '';
        } else if (typeof visible === 'number') {
            isVisible = visible !== 0;
        }

        const counterBox = document.getElementById(`${counterId}-box`);
        if (counterBox) {
            counterBox.style.display = isVisible ? 'block' : 'none';
            console.log(`🔢 Set ${counterId} visibility: ${isVisible}`);

            // Rebuild carousel after visibility change
            setTimeout(() => {
                this.CarouselManager.rebuild();
            }, 100);
        }
    }

    enableTestMode() {
        console.log('🔢 Enabling test mode - Streamer.bot client not available');

        // Set test data
        setTimeout(() => {
            this.updateCounterValue('counter1', '42');
            this.updateCounterValue('counter2', '108');
            this.updateCounterValue('counter3', '256');
            this.updateCounterValue('counter4', '512');

            this.updateCounterLabel('counter1', 'Followers');
            this.updateCounterLabel('counter2', 'Subscribers');
            this.updateCounterLabel('counter3', 'Bits');
            this.updateCounterLabel('counter4', 'Raids');
        }, 2000);
    }

    // Test functions for development
    testCounterValues() {
        console.log('🔢 Testing counter values...');
        this.updateCounterValue('counter1', Math.floor(Math.random() * 1000));
        this.updateCounterValue('counter2', Math.floor(Math.random() * 500));
        this.updateCounterValue('counter3', Math.floor(Math.random() * 10000));
        this.updateCounterValue('counter4', Math.floor(Math.random() * 100));
    }

    testCounterLabels() {
        console.log('🔢 Testing counter labels...');
        const labels = ['Follows', 'Subs', 'Cheers', 'Raids'];
        Object.keys(this.config).forEach((counterId, index) => {
            this.updateCounterLabel(counterId, labels[index]);
        });
    }

    testCounterVisibility() {
        console.log('🔢 Testing counter visibility...');
        const counters = Object.keys(this.config);
        counters.forEach((counterId, index) => {
            // Toggle visibility randomly
            this.setCounterVisibility(counterId, Math.random() > 0.3);
        });
    }

    setupDebugFunctions() {
        // Global debug functions
        window.countersComponent = this;

        window.debugCounters = () => {
            console.log('🔢 Counters Component Debug Info:');
            console.log('- Connected:', this.isConnected);

            Object.keys(this.config).forEach(counterId => {
                const counterElement = document.getElementById(`counter-${counterId}`);
                const labelElement = document.getElementById(`${counterId}-label`);
                const boxElement = document.getElementById(`${counterId}-box`);

                console.log(`- ${counterId}:`, {
                    value: counterElement?.textContent,
                    label: labelElement?.textContent,
                    visible: boxElement?.style.display !== 'none'
                });
            });
        };

        window.testCounterValues = () => this.testCounterValues();
        window.testCounterLabels = () => this.testCounterLabels();
        window.testCounterVisibility = () => this.testCounterVisibility();

        // Carousel debug functions
        window.debugCarousel = () => {
            console.log('🎠 CarouselManager State:', this.CarouselManager.state);
        };

        window.testSlideNavigation = (index) => {
            console.log(`🎠 Testing navigation to slide ${index}`);
            this.CarouselManager.goToSlide(index);
        };

        window.toggleAutoplay = () => {
            if (this.CarouselManager.state.isPaused) {
                this.CarouselManager.startAutoplay();
                console.log('🎠 Autoplay resumed');
            } else {
                this.CarouselManager.pauseAutoplay();
                console.log('🎠 Autoplay paused');
            }
        };

        console.log('🔢 Debug functions registered: debugCounters(), testCounterValues(), debugCarousel(), testSlideNavigation(index), toggleAutoplay()');
    }

    // CarouselManager creation
    createCarouselManager() {
        const self = this;

        return {
            state: {
                currentSlide: 0,
                totalSlides: 0,
                slides: [],
                autoplayTimer: null,
                intervalDuration: 5000,
                isPaused: false,
                indicatorSyncTimer: null,
                animationStartTime: null
            },

            init() {
                console.log('🎠 Initializing pure CSS carousel...');
                this.buildSlides();
                this.createHTML();
                this.setupIndicators();
                this.startAutoplay();
                this.setupEventListeners();
            },

            buildSlides() {
                console.log('🎠 Building slides from visible counter boxes and goals...');
                this.state.slides = [];

                // Add counter slides for visible counters
                ['counter1', 'counter2', 'counter3', 'counter4'].forEach(counterId => {
                    const counterBox = document.getElementById(`${counterId}-box`);
                    if (counterBox && counterBox.style.display !== 'none') {
                        this.state.slides.push({
                            type: 'counter',
                            id: counterId
                        });
                    }
                });

                this.state.totalSlides = this.state.slides.length;
                console.log(`🎠 Built ${this.state.totalSlides} slides:`, this.state.slides.map(s => s.id));
            },

            createHTML() {
                console.log('🎠 Creating slide HTML elements...');
                const track = document.getElementById('carousel-track');
                if (!track) return;

                track.innerHTML = '';

                this.state.slides.forEach((slide, index) => {
                    const slideDiv = this.createSlideElement(slide, index);
                    track.appendChild(slideDiv);
                });

                // Create infinite clone of first slide for seamless looping
                if (this.state.slides.length > 1) {
                    const firstSlide = this.state.slides[0];
                    const firstSlideClone = this.createSlideElement(firstSlide, 'clone');
                    firstSlideClone.classList.add('infinite-clone');
                    track.appendChild(firstSlideClone);
                }

                console.log(`🎠 Created ${track.children.length} slide elements (including clone)`);
            },

            createSlideElement(slide, index) {
                const slideDiv = document.createElement('div');
                slideDiv.className = 'carousel-slide';
                slideDiv.id = `slide-${index}`;
                slideDiv.setAttribute('data-slide-index', index);

                if (slide.type === 'counter') {
                    slideDiv.innerHTML = `
                        <div class="single-counter-display">
                            <div class="counter-value-large"
                                 id="carousel-${slide.id}-value"
                                 data-counter-id="${slide.id}"
                                 data-counter-type="value">0</div>
                            <div class="counter-label-large"
                                 id="carousel-${slide.id}-label"
                                 data-counter-id="${slide.id}"
                                 data-counter-type="label">${slide.id}</div>
                        </div>
                    `;

                    // Copy current values from original counter
                    const originalValue = document.getElementById(`counter-${slide.id}`);
                    const originalLabel = document.getElementById(`${slide.id}-label`);
                    if (originalValue) {
                        slideDiv.querySelector(`#carousel-${slide.id}-value`).textContent = originalValue.textContent;
                    }
                    if (originalLabel) {
                        slideDiv.querySelector(`#carousel-${slide.id}-label`).textContent = originalLabel.textContent;
                    }
                }

                return slideDiv;
            },

            goToSlide(index) {
                if (index < 0 || index >= this.state.totalSlides) return;

                console.log(`🎠 Manual navigation to slide ${index}`);
                const track = document.querySelector('.carousel-track');

                // Remove auto-rotation class to stop automatic movement
                track.classList.remove('auto-rotate');
                track.classList.remove('paused');

                // Remove any existing manual slide classes
                track.classList.forEach(className => {
                    if (className.startsWith('manual-slide-')) {
                        track.classList.remove(className);
                    }
                });

                // Apply the specific manual slide class for CSS transform
                track.classList.add(`manual-slide-${index}`);

                // Update state
                this.state.currentSlide = index;
                this.updateIndicators(index);

                // Resume autoplay after 10 seconds
                setTimeout(() => {
                    this.startAutoplay();
                }, 10000);
            },

            startAutoplay() {
                if (this.state.totalSlides <= 1) {
                    console.log('🎠 Skipping autoplay - only one slide');
                    return;
                }

                console.log('🎠 Starting CSS-based autoplay...');
                this.generateDynamicCSS();

                const track = document.querySelector('.carousel-track');
                track.classList.remove('paused');
                track.classList.forEach(className => {
                    if (className.startsWith('manual-slide-')) {
                        track.classList.remove(className);
                    }
                });

                track.classList.add('auto-rotate');

                this.state.isPaused = false;
                this.state.animationStartTime = Date.now();

                // Start syncing indicators
                this.startIndicatorSync();
            },

            pauseAutoplay() {
                const track = document.querySelector('.carousel-track');
                track.classList.add('paused');
                this.state.isPaused = true;

                if (this.state.indicatorSyncTimer) {
                    clearInterval(this.state.indicatorSyncTimer);
                }
                console.log('🎠 Autoplay paused');
            },

            generateDynamicCSS() {
                const totalSlides = this.state.totalSlides;
                const slideDisplayTime = this.state.intervalDuration; // 5 seconds per slide
                const transitionTime = slideDisplayTime * 0.1; // 10% transition, 90% hold
                const totalDuration = totalSlides * slideDisplayTime;

                // Update CSS variable
                document.documentElement.style.setProperty('--carousel-duration', `${totalDuration / 1000}s`);

                // Generate keyframes for smooth animation with holds
                let keyframes = '';
                const slidePercentage = 100 / totalSlides;

                for (let i = 0; i <= totalSlides; i++) {
                    const startPercent = (i / totalSlides) * 100;
                    const endPercent = ((i + 1) / totalSlides) * 100 - (transitionTime / slideDisplayTime) * slidePercentage * 0.5;

                    if (i === 0) {
                        keyframes += `0% { transform: translateX(0%); }\n`;
                    } else {
                        keyframes += `${startPercent}% { transform: translateX(-${(i - 1) * 100}%); }\n`;
                        if (i < totalSlides) {
                            keyframes += `${endPercent}% { transform: translateX(-${(i - 1) * 100}%); }\n`;
                        }
                    }

                    if (i === totalSlides) {
                        keyframes += `100% { transform: translateX(-${i * 100}%); }\n`;
                    }
                }

                // Remove existing dynamic CSS
                const existingStyle = document.getElementById('dynamic-carousel-css');
                if (existingStyle) {
                    existingStyle.remove();
                }

                // Inject new CSS
                const style = document.createElement('style');
                style.id = 'dynamic-carousel-css';
                style.textContent = `
                    @keyframes carousel-auto-rotate {
                        ${keyframes}
                    }
                `;
                document.head.appendChild(style);

                console.log(`🎠 Generated CSS animation: ${totalSlides} slides, ${totalDuration / 1000}s total duration`);
            },

            startIndicatorSync() {
                if (this.state.indicatorSyncTimer) {
                    clearInterval(this.state.indicatorSyncTimer);
                }

                this.state.indicatorSyncTimer = setInterval(() => {
                    if (this.state.isPaused) return;

                    const now = Date.now();
                    const elapsed = now - this.state.animationStartTime;
                    const cycleDuration = this.state.totalSlides * this.state.intervalDuration;
                    const currentCycleTime = elapsed % cycleDuration;
                    const currentSlideIndex = Math.floor(currentCycleTime / this.state.intervalDuration);

                    // Only update during the "hold" period (not during transitions)
                    const slideProgress = (currentCycleTime % this.state.intervalDuration) / this.state.intervalDuration;
                    if (slideProgress >= 0.1 && slideProgress <= 0.9) {
                        this.updateIndicators(currentSlideIndex);
                    }
                }, 100);
            },

            updateIndicators(activeIndex) {
                const indicators = document.querySelectorAll('.indicator');
                indicators.forEach((indicator, index) => {
                    indicator.classList.toggle('active', index === activeIndex);
                });
            },

            setupIndicators() {
                console.log('🎠 Setting up carousel indicators...');
                const indicatorsContainer = document.getElementById('carousel-indicators');
                if (!indicatorsContainer) return;

                indicatorsContainer.innerHTML = '';

                this.state.slides.forEach((slide, index) => {
                    const indicator = document.createElement('div');
                    indicator.className = 'indicator';
                    indicator.setAttribute('data-slide', index);
                    indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);

                    indicator.addEventListener('click', () => {
                        this.goToSlide(index);
                    });

                    indicatorsContainer.appendChild(indicator);
                });

                // Set first indicator as active
                const firstIndicator = indicatorsContainer.querySelector('.indicator');
                if (firstIndicator) {
                    firstIndicator.classList.add('active');
                }

                console.log(`🎠 Created ${this.state.slides.length} indicators`);
            },

            setupEventListeners() {
                const carouselContainer = document.querySelector('.carousel-container');
                if (!carouselContainer) return;

                carouselContainer.addEventListener('mouseenter', () => {
                    if (!this.state.isPaused) {
                        this.pauseAutoplay();
                        console.log('🎠 Paused on hover');
                    }
                });

                carouselContainer.addEventListener('mouseleave', () => {
                    if (this.state.isPaused) {
                        this.startAutoplay();
                        console.log('🎠 Resumed after hover');
                    }
                });
            },

            syncData(variableName, value) {
                // Update carousel counter displays when main counters update
                ['counter1', 'counter2', 'counter3', 'counter4'].forEach(counterId => {
                    const config = self.config[counterId];

                    if (!config) return;

                    if (variableName === config.valueVariable) {
                        // Update ALL carousel value elements (original + clone)
                        const carouselValues = document.querySelectorAll(`[data-counter-id="${counterId}"][data-counter-type="value"]`);
                        carouselValues.forEach(element => {
                            const displayValue = value === undefined || value === null || value === 'undefined' ? '0' : String(value);
                            element.textContent = displayValue;
                        });
                    }

                    if (variableName === config.labelVariable) {
                        // Update ALL carousel label elements (original + clone)
                        const carouselLabels = document.querySelectorAll(`[data-counter-id="${counterId}"][data-counter-type="label"]`);
                        carouselLabels.forEach(element => {
                            element.textContent = value || config.defaultLabel;
                        });
                    }
                });

                // Ensure clones are synchronized as fallback
                this.syncClonesWithOriginals();
            },

            syncClonesWithOriginals() {
                // Fallback synchronization for infinite clones
                const clones = document.querySelectorAll('.infinite-clone');

                clones.forEach(clone => {
                    const originalSlide = document.querySelector('[data-slide-index="0"]'); // First slide

                    if (originalSlide) {
                        // Sync counter values
                        const originalValues = originalSlide.querySelectorAll('[data-counter-type="value"]');
                        const cloneValues = clone.querySelectorAll('[data-counter-type="value"]');

                        originalValues.forEach((original, index) => {
                            if (cloneValues[index]) {
                                cloneValues[index].textContent = original.textContent;
                            }
                        });

                        // Sync counter labels
                        const originalLabels = originalSlide.querySelectorAll('[data-counter-type="label"]');
                        const cloneLabels = clone.querySelectorAll('[data-counter-type="label"]');

                        originalLabels.forEach((original, index) => {
                            if (cloneLabels[index]) {
                                cloneLabels[index].textContent = original.textContent;
                            }
                        });
                    }
                });
            },

            rebuild() {
                // Rebuild when content changes (counter visibility, goals)
                console.log('🔄 Rebuilding carousel due to content changes...');

                // Stop current animation
                this.pauseAutoplay();

                // Rebuild slides
                this.buildSlides();
                this.createHTML();
                this.setupIndicators();

                // Restart if we have slides
                if (this.state.totalSlides > 0) {
                    setTimeout(() => {
                        this.startAutoplay();
                    }, 500);
                } else {
                    console.log('🎠 No slides to display, carousel disabled');
                    const track = document.getElementById('carousel-track');
                    if (track) {
                        track.classList.add('error');
                    }
                }
            }
        };
    }
}

// Initialize the counters component when script loads
new CountersComponent();