'use client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard, Navigation } from 'swiper/modules';
import 'swiper/css';
import { ArrowLeft, ArrowRight } from 'lucide-react';
const experiences = [
  ['01 / CASA', 'Um espaço para', 'sentir.', 'O cuidado transforma o lugar onde a vida acontece.'],
  [
    '02 / BEM-ESTAR',
    'Uma pausa para',
    'florescer.',
    'Pequenos rituais para estar presente na sua própria rotina.',
  ],
  [
    '03 / CRIAÇÃO',
    'Um olhar para',
    'inspirar.',
    'A sua maneira de viver pode despertar novas possibilidades.',
  ],
];
export function Experiences() {
  return (
    <div className="experiences-carousel">
      <Swiper
        modules={[A11y, Keyboard, Navigation]}
        a11y={{
          prevSlideMessage: 'Experiência anterior',
          nextSlideMessage: 'Próxima experiência',
          slideLabelMessage: '{{index}} de {{slidesLength}}',
        }}
        keyboard={{ enabled: true }}
        navigation={{ prevEl: '.experience-prev', nextEl: '.experience-next' }}
        spaceBetween={24}
        slidesPerView={1.1}
        breakpoints={{ 760: { slidesPerView: 2.2 }, 1100: { slidesPerView: 3 } }}
      >
        {experiences.map(([label, title, accent, description], index) => (
          <SwiperSlide key={label}>
            <article className={`experience-panel mood-${index}`}>
              <span className="eyebrow">{label}</span>
              <div className="experience-art" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h3>
                {title}
                <br />
                <em>{accent}</em>
              </h3>
              <p>{description}</p>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="carousel-controls">
        <span>O cuidado tem muitas formas.</span>
        <div>
          <button className="experience-prev" aria-label="Experiência anterior">
            <ArrowLeft size={19} />
          </button>
          <button className="experience-next" aria-label="Próxima experiência">
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
