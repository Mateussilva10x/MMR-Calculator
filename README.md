# Calculadora de MMR — League of Legends

App web (mobile e desktop) que estima o **MMR** de um jogador de League of Legends e diz se ele está
**acima, abaixo ou de acordo com o elo atual** — útil especialmente antes do reset de 2027, quando
todo mundo vai querer saber de onde realmente começa.

🔗 Roda 100% no navegador: sem backend, sem login, sem chave de API.

## Por que é uma estimativa

A Riot **não expõe o MMR** nem no cliente nem na API pública. O que dá para fazer — e é o que op.gg,
whatismymmr e similares fazem — é inferir o MMR pelos efeitos observáveis dele:

| Sinal | Peso | Por quê |
|---|---|---|
| Assimetria de LP (ganho vs. perda por partida) | principal (65%) | A Riot ajusta o LP ganho/perdido pela distância entre MMR e elo |
| Winrate recente | secundário (35%) | O matchmaking empurra todo jogador para ~50% de winrate |
| Nº de partidas | modula os dois | Amostras pequenas pesam menos e reduzem a confiança |

A margem típica é de cerca de **uma divisão**. O modelo vive em [`src/lib/mmr.ts`](src/lib/mmr.ts) e
está coberto por testes em [`src/lib/mmr.test.ts`](src/lib/mmr.test.ts).

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes do modelo
npm run build    # build de produção em dist/
```

## Deploy

- **GitHub Pages**: habilite antes em *Settings → Pages → Source: **GitHub Actions***. O workflow
  não consegue ligar o Pages sozinho (o `GITHUB_TOKEN` não tem essa permissão) e, em repositório
  **privado**, Pages exige plano pago (Pro/Team). Feito isso, todo push na branch padrão publica em
  `https://<usuario>.github.io/MMR-Calculator/`.
- **Vercel / Netlify / Cloudflare Pages**: build `npm run build`, pasta `dist`. Nada mais.

## Stack

React 18 + TypeScript + Vite. Sem framework de UI e sem dependências de runtime além do React.

---

Projeto independente, sem vínculo com a Riot Games. League of Legends é marca registrada da Riot Games, Inc.
