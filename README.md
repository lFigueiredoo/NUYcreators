# NUY Creators

Plataforma de comunidade e creators da NUY. Entrega atual: infraestrutura, base Appwrite declarativa, autenticação/onboarding e landing responsiva. Dashboard, moderação, pontos, ranking operacional e resgates ficam para as próximas etapas.

```powershell
npm ci
npm run dev
```

Abra http://localhost:3000. Não precisa configurar Appwrite para navegar na interface. Sem conexão real, autenticação e salvamento ficam explicitamente indisponíveis.

Documentação:

- [Arquitetura](docs/nuy-creators-architecture.md)
- [Banco](docs/database.md)
- [Fluxos](docs/flows.md)
- [Infraestrutura e conexão Cloud](docs/infrastructure.md)
- [Functions](functions/README.md)

Comandos: `typecheck`, `test`, `lint`, `build`, `test:e2e`, `format:check`, `infra:plan`, `infra:apply`. E2E usa servidor de produção: execute `npm run build` antes. Nunca versionar `.env.local` ou chaves. Não habilitar operações financeiras antes dos testes transacionais no Appwrite Cloud.

[Relatório da entrega e lista completa de arquivos](docs/delivery-phase-1.md).
