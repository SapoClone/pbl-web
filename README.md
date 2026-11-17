# React Tailwindcss Boilerplate build with Vite

This is a boilerplate build with Vite, React 18, TypeScript, Vitest, Testing Library, TailwindCSS 3, Eslint and Prettier.

## What is inside?

This project uses tools like:

- [Vite](https://vitejs.dev)
- [ReactJS](https://reactjs.org)
- [TypeScript](https://www.typescriptlang.org)

UI framework

- [Shadcn](https://ui.shadcn.com/docs)
- [Tailwindcss](https://tailwindcss.com)

API Integration

- [Tanstack Query](https://tanstack.com/query/latest)

Router - Navigation

- [Tanstack Router](https://tanstack.com/router/v1)

State Management

- [Zustand](https://zustand-demo.pmnd.rs/)

Testing

- [Vitest](https://vitest.dev)
- [Testing Library](https://testing-library.com)

Formatting

- [Eslint](https://eslint.org)
- [Prettier](https://prettier.io)

## Getting Started

Install dependencies.

```bash
yarn install
```

Serve with hot reload at <http://localhost:5173>.

```bash
yarn dev
```

In development, authentication uses a local mock by default so the Omniretail
screens can be reviewed without a backend. Use this account:

```text
Email:    admin@omniretail.vn
Password: Admin@123
```

To use the real authentication API instead, create a `.env.local` file with:

```env
VITE_USE_MOCK_AUTH=false
VITE_USE_MOCK_ADMIN=false
VITE_API_URL=http://localhost:3000/api/v1
```

Restart Vite after changing environment variables. Mock authentication is
enabled only in development and is never enabled in production builds.

Admin screens use mock data by default in development. Set
`VITE_USE_MOCK_ADMIN=false` when the backend admin endpoints are available.

Admin mock mutations are persisted in browser Local Storage with keys prefixed
by `pbl-admin-mock:`. To reset all mock admin changes, open DevTools and run:

```js
Object.keys(localStorage)
  .filter((key) => key.startsWith("pbl-admin-mock:"))
  .forEach((key) => localStorage.removeItem(key))
```

The provider and mock authentication are covered by automated tests. Run them
once with:

```bash
npx vitest run
```

Watch routes change

```bash
yarn tsr watch
```

### Lint

```bash
yarn lint
```

### Typecheck

```bash
yarn typecheck
```

### Format

```bash
yarn format
```

### Build

```bash
yarn build
```

### Test

```bash
yarn test
```

View and interact with your tests via UI.

```bash
yarn test:ui
```
corepack yarn dev