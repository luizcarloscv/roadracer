# Guia de Instalação Road Racer MC (Android)

Este guia explica como transformar o código que você baixou em um aplicativo APK real.

## 1. Pré-requisitos no seu Computador
Certifique-se de ter instalado:
- **Node.js** (Versão 18 ou superior)
- **VS Code**
- **Android Studio**

## 2. Preparando o Projeto
Abra a pasta do projeto no VS Code, abra o terminal e digite:

```bash
# Instala as dependências
npm install

# Gera a versão final do site
npm run build
```

## 3. Configurando o Android (Capacitor)
No mesmo terminal, rode:

```bash
# Adiciona a plataforma Android
npx cap add android

# Copia o código para a pasta do Android
npx cap sync
```

## 4. Gerando o APK no Android Studio
Agora, abra o Android Studio e:
1. Clique em **Open** e selecione a pasta `android` que foi criada dentro do seu projeto.
2. Espere o Android Studio terminar de carregar (pode levar alguns minutos na primeira vez).
3. No menu superior, vá em: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Quando terminar, clique no link **locate** que aparecerá no canto inferior direito.
5. O arquivo `app-debug.apk` é o seu aplicativo!

## 5. Dicas Importantes
- **Atualizações**: Sempre que você mudar algo no código no VS Code, você precisa rodar `npm run build` e depois `npx cap sync` para que a mudança vá para o Android Studio.
- **Ícones**: Para mudar o ícone que aparece no celular, você pode usar o comando `npx cordova-res android --skip-config --copy` (requer instalação do cordova-res).

---
*Road Racer Moto Clube — Sistema de Gestão e Emergência*
