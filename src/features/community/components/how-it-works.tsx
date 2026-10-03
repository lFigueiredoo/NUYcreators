'use client';
import { motion, useReducedMotion } from 'motion/react';
const steps = [
  ['01', 'Traga o seu olhar.', 'Crie seu perfil e conte o que torna sua rotina única.'],
  ['02', 'Crie com propósito.', 'Participe dos desafios e compartilhe suas experiências com NUY.'],
  [
    '03',
    'Conquiste novas sensações.',
    'Conteúdos aprovados geram Pontos NUY para desbloquear recompensas.',
  ],
];
export function HowItWorks() {
  const reduced = useReducedMotion();
  return (
    <div className="steps">
      {steps.map(([number, title, description], index) => (
        <motion.article
          key={number}
          initial={false}
          whileInView={reduced ? {} : { y: [12, 0] }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.08 }}
        >
          <span>{number}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </motion.article>
      ))}
    </div>
  );
}
