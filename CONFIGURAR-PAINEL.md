# Ativação do painel Aeroboy

O projeto já contém a interface, APIs, autenticação, banco e upload de imagens. A ativação deve ser feita no mesmo projeto do Cloudflare Pages que publica a pasta `dist`.

## Recursos usados

- D1 com binding `AEROBOY_DB`
- R2 com binding `AEROBOY_MEDIA`
- Secret `ADMIN_PASSWORD`
- Secret `SESSION_SECRET`

Nunca coloque os valores reais das senhas no GitHub.

## Passos

1. Crie um banco D1 chamado `aeroboy-catalog`.
2. Se for usar o Wrangler pela linha de comando, copie `wrangler.example.toml` para `wrangler.toml` e substitua `COLE_AQUI_O_ID_DO_D1` pelo ID desse banco. Pela interface do Cloudflare Pages, basta criar os bindings descritos abaixo.
3. Aplique a migração `migrations/0001_aeroboy_admin.sql` no banco.
4. Crie um bucket R2 chamado `aeroboy-media`.
5. Em **Workers & Pages → projeto Aeroboy → Settings → Bindings**, conecte:
   - D1: variável `AEROBOY_DB`
   - R2: variável `AEROBOY_MEDIA`
6. Em **Variables and secrets**, configure:
   - `ADMIN_PASSWORD` como Secret
   - `SESSION_SECRET` como Secret com uma chave aleatória longa
7. Publique novamente o projeto.
8. Entre em `/painel/`, faça login e use **Importar catálogo atual** uma única vez.

## O que o painel gerencia

- produtos, preços de varejo e atacado;
- linhas, categorias e tamanhos;
- fotos enviadas para o R2;
- visibilidade e ordem no catálogo;
- textos e links principais;
- unidades e números de WhatsApp;
- pedidos iniciados no catálogo e seus status.

Se o banco estiver temporariamente indisponível, o catálogo público continua mostrando os produtos estáticos atuais. O botão de WhatsApp também continua funcionando.
