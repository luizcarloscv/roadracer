# Road Racer App - Moto Clube Management System

Este é o sistema completo de gestão do **Road Racer Moto Clube**, desenvolvido para facilitar a comunicação, segurança e organização dos membros e seus passeios.

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 18 + Vite
- **Estilização:** Tailwind CSS + Shadcn/UI
- **Animações:** Motion (Framer Motion)
- **Backend/Banco de Dados:** Firebase (Firestore, Authentication, Storage)
- **Ícones:** Lucide React
- **Notificações:** Sonner

## 🛠️ Funcionalidades Principais

### 1. Gestão de Membros e Perfil
- **Autenticação:** Login seguro via Google ou E-mail/Senha.
- **Perfil Completo:** Edição de nome, telefone, tipo sanguíneo e foto.
- **Minha Máquina:** Cadastro detalhado da motocicleta (Marca, Modelo, Ano, Cor, Placa).
- **Segurança:** Troca de senha integrada ao Firebase Auth.

### 2. Gestão de Passeios (Rides)
- **Criação:** Administradores podem criar novos destinos com data, hora e ponto de encontro.
- **Participação:** Membros podem confirmar presença com um clique.
- **Identificação:** A lista de participantes exibe o nome e a moto de cada piloto.
- **Notificações:** Alertas em tempo real para todos os membros quando um passeio é criado ou quando alguém entra.

### 3. Sistema de Emergência (SOS)
- **Acionamento:** Botão de pânico que envia a localização exata em tempo real.
- **Alerta Sonoro:** Som de alarme (bomba/nuclear) que toca repetidamente para todos os membros até ser visualizado.
- **Resgate:** Botão "Ir Ajudar" que abre a rota no Google Maps para o local da emergência.
- **Monitoramento:** Atualização automática da posição do membro em perigo.

### 4. Painel Administrativo (Gestão)
- **Aprovação:** Controle de novos membros (novos cadastros ficam em espera até aprovação).
- **Cargos:** Atribuição de funções (Presidente, Diretoria, Membro).
- **Lojas Parceiras:** Cadastro de estabelecimentos que oferecem benefícios ao clube.
- **Configuração:** Alteração da logo oficial do clube em todo o sistema.

## 📍 Rotas e Navegação

O sistema utiliza uma navegação baseada em abas (Tabs) para uma experiência fluida:
- **Passeios (`rides`):** Mural de viagens agendadas e confirmadas.
- **Mapa (`map`):** Visualização em tempo real (simulada) e acionamento de SOS.
- **Lojas Parceiras (`stores`):** Guia de benefícios para membros.
- **Nossa História (`history`):** Memorial e trajetória do Moto Clube.
- **Gestão (`admin`):** Acesso restrito para controle de membros e sistema.

## 📂 Estrutura do Projeto

- `/src/components`: Componentes modulares (Layout, Rides, Emergency, Profile, etc).
- `/src/lib/firebase.ts`: Configuração central e conexão com o banco de dados.
- `/src/types`: Definições de tipos TypeScript para garantir consistência dos dados.
- `/firestore.rules`: Regras de segurança que protegem os dados no Firebase.

## ⚙️ Como Instalar e Rodar

1. **Clonar/Extrair o projeto.**
2. **Instalar dependências:**
   ```bash
   npm install
   ```
3. **Rodar em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
4. **Build para produção:**
   ```bash
   npm run build
   ```

## 🔐 Configuração do Firebase

As credenciais do Firebase estão fixadas em `src/lib/firebase.ts`. Isso garante que o projeto funcione imediatamente ao ser baixado, conectando-se ao banco de dados `ai-studio-39ba9f98-0228-483e-9e90-efedb5f73770`.

---
*Desenvolvido para a irmandade Road Racer.* 🏍️💨
