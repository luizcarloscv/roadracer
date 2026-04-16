# Estrutura de Dados e Segurança (Firebase)

Para replicar este projeto, é necessário configurar o Firebase com as seguintes coleções e regras.

## 📊 Coleções do Firestore

### 1. `users` (Perfis dos Membros)
- **ID do Documento:** UID do usuário (Firebase Auth).
- **Campos:**
  - `uid`: string
  - `displayName`: string
  - `nick`: string
  - `email`: string
  - `role`: string ('presidente', 'diretoria', 'membro')
  - `phone`: string
  - `bloodType`: string
  - `motorcycle`: map { make, model, year, color, plate }
  - `photoURL`: string (base64 ou URL)
  - `isBlocked`: boolean
  - `createdAt`: timestamp string

### 2. `rides` (Passeios)
- **Campos:**
  - `title`: string
  - `destination`: string
  - `date`: string
  - `meetingPoint`: string
  - `departureTime`: string
  - `arrivalTime`: string
  - `createdBy`: string (UID)
  - `participants`: array of maps { uid, name, motorcycle }
  - `status`: string ('planned', 'ongoing', 'completed')

### 3. `notifications` (Sistema de Alertas)
- **Campos:**
  - `type`: string ('ride_created', 'ride_join')
  - `title`: string
  - `message`: string
  - `rideId`: string
  - `createdAt`: timestamp string
  - `readBy`: array of strings (UIDs)

### 4. `emergencies` (SOS)
- **Campos:**
  - `userId`: string
  - `userName`: string
  - `location`: map { latitude, longitude }
  - `status`: string ('active', 'resolved')
  - `responders`: array of maps { uid, name }
  - `timestamp`: timestamp string

### 5. `config`
- **Documento `app`:**
  - `logoUrl`: string (Logo oficial do clube)

## 🛡️ Regras de Segurança (Resumo)

As regras em `firestore.rules` garantem que:
1. **Passeios:** Apenas administradores criam; todos leem; membros podem atualizar apenas a lista de participantes.
2. **Perfis:** Usuários editam apenas seu próprio perfil (exceto o campo `role`).
3. **Emergências:** Todos podem criar; todos podem ler; apenas o dono ou admin pode finalizar.
4. **Notificações:** Todos podem criar e ler; atualização permitida apenas para marcar como lido (`readBy`).

## 📁 Storage
Utilizado para armazenar fotos de perfil e logos, organizados por UID ou pastas de sistema.

---
*Este guia serve como base técnica para a manutenção e evolução do sistema.* 🏍️🛠️
