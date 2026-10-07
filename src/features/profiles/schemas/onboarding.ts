import { z } from 'zod';
const states = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;
function social(domain: string) {
  return z.union([
    z.literal(''),
    z
      .url()
      .max(2048)
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === 'https:' &&
          [domain, `www.${domain}`].includes(url.hostname) &&
          !url.username &&
          !url.password &&
          url.pathname !== '/'
        );
      }, 'Informe uma URL HTTPS da plataforma correta.'),
  ]);
}
/**
 * Opções do perfil, declaradas UMA vez. O formulário de edição importa daqui:
 * duas listas de valores para o mesmo campo é como um cadastro passa e a edição
 * não.
 */
export const niches = ['casa', 'bem-estar', 'beleza', 'lifestyle', 'outro'] as const;
export const creatorTypes = ['consumidor', 'ugc', 'influenciador'] as const;
export const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^\+?[\d\s()-]{10,20}$/, 'Informe um telefone válido.'),
  city: z.string().trim().min(2).max(100),
  state: z.enum(states),
  birthDate: z.iso
    .date()
    .refine(
      (value) => value <= new Date().toISOString().slice(0, 10) && value >= '1900-01-01',
      'Data inválida.',
    ),
  niche: z.enum(niches),
  creatorType: z.enum(creatorTypes),
  instagram: social('instagram.com'),
  tiktok: social('tiktok.com'),
  youtube: social('youtube.com'),
  terms: z.literal('on'),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export const brazilianStates = states;
