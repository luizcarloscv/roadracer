# Backend gratis para Road Racer (Render)

Este backend permite:

- Excluir membro de verdade (Auth + Firestore), liberando e-mail para novo cadastro.
- Disparar push FCM com app fechado (SOS e passeio).

## 1) Subir no Render

1. Crie conta em https://render.com
2. New + > Web Service
3. Conecte este repositório
4. Configure:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

## 2) Variáveis de ambiente no Render

Adicionar:

- `FIREBASE_PROJECT_ID=ai-studio-applet-webapp-b1e44`
- `FIREBASE_CLIENT_EMAIL=<client_email_da_service_account>`
- `FIREBASE_PRIVATE_KEY=<private_key_da_service_account_com_\n>`
- `ADMIN_EMAILS=luizcarloscv@msn.com`

Como pegar `client_email` e `private_key`:

1. Firebase Console > Configurações do projeto > Contas de serviço
2. "Gerar nova chave privada"
3. Use os campos do JSON.

No Render, a chave privada deve ficar com `\n` no lugar de quebra de linha real.

## 3) Teste rápido

Quando o deploy terminar, abra:

- `https://SEU-BACKEND.onrender.com/health`

Deve retornar `{ "ok": true }`.

## 4) Configurar app

No app web/mobile, configure:

- `VITE_BACKEND_URL=https://SEU-BACKEND.onrender.com`

Arquivo local recomendado: `.env`

## 5) Build e sync Android

Na raiz do projeto:

```powershell
npm run build
npx cap sync android
```

