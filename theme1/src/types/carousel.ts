export interface CounterConfig {
  valueVariable: string;
  labelVariable: string;
  toggleVariable: string;
}

export interface CarouselSlide {
  type: 'counter';
  id: string;
}

export interface CarouselState {
  currentSlide: number;
  totalSlides: number;
  slides: CarouselSlide[];
  autoplayTimer: NodeJS.Timeout | null;
  intervalDuration: number;
  isPaused: boolean;
  indicatorSyncTimer: NodeJS.Timeout | null;
  animationStartTime: number | null;
}

export interface CounterState {
  value?: string;
  label?: string;
}
