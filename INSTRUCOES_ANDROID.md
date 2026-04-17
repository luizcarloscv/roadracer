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
Se você recebeu o erro "android platform has not been added yet", siga exatamente esta ordem:

```bash
# 1. Adiciona a plataforma Android ao projeto local
npx cap add android

# 2. Copia o código e plugins para a pasta do Android
npx cap sync
```

*Nota: Se o comando `add` disser que a pasta já existe, você pode tentar `npx cap sync` novamente ou apagar a pasta `android` e rodar o `add` de novo.*

## 4. Gerando o APK no Android Studio
Agora, abra o Android Studio e:
1. Clique em **Open** e selecione a pasta `android` que está dentro do seu projeto.
2. Espere o Android Studio terminar de carregar (o "Gradle Sync" no rodapé deve finalizar).
3. No menu superior, vá em: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Quando terminar, clique no link **locate** que aparecerá no canto inferior direito.
5. O arquivo `roadracer-v1.0.xxxx-debug.apk` é o seu aplicativo!

## 5. Dicas Importantes
- **Atualizações**: Sempre que você mudar algo no código no VS Code, você precisa rodar `npm run build` e depois `npx cap sync` para que a mudança vá para o Android Studio.
- **Erro de JDK**: Se o Android Studio reclamar da versão do Java, vá em *Settings > Build, Execution, Deployment > Build Tools > Gradle* e mude o "Gradle JDK" para a versão 17 ou 21.

---
*Road Racer Moto Clube — Sistema de Gestão e Emergência*