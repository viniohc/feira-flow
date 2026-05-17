# Caixa da Feira

PWA offline-first em Vue 3 para controle rápido de pedidos e vendas em festa/feira.

## Rodar localmente

```bash
npm install
npm run dev
```

O app salva vendas e produtos primeiro no aparelho. O Firestore só é usado quando você toca em **Sync**.
Antes de usar em outro aparelho, faça login, escolha a feira correta e toque em **Sync** para enviar e puxar os dados mais recentes.

Para validar:

```bash
npm run test
npm run build
```

## Configurar Firebase/Firestore

O app foi preparado para usar Firebase/Firestore sem hardcode de credenciais. O fluxo local com IndexedDB continua funcionando offline; os services do Firestore ficam centralizados para sincronização futura.

1. Acesse o Firebase Console e crie um projeto.
2. Não ative billing se quiser permanecer no plano Spark.
3. No projeto, crie um app Web.
4. Copie a configuração do app Web.
5. Crie o arquivo `.env` na raiz do projeto, usando `.env.example` como modelo:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

6. No Firebase Console, crie o Firestore Database.
7. Comece em modo bloqueado/produção, não em modo aberto público.
8. Em **Authentication > Sign-in method**, habilite **Email/Password**.
9. Em **Authentication > Users**, crie os usuários que poderão usar o caixa.
10. Publique as regras do arquivo `firestore.rules`.

## Testar conexão com Firestore

Depois de preencher o `.env`, rode:

```bash
npm run dev
```

No código, a função `testFirestoreConnection()` em `src/services/firestore/connection.ts` faz uma leitura pontual do documento `settings/default`.

Também existe um teste de linha de comando:

```bash
npm run test:firestore
```

Com as regras atuais, o app usa Firebase Authentication com email/senha. O Firestore só libera leitura/escrita para usuários autenticados e membros da feira.

## Regras de segurança

Regra inicial para o MVP com login e feiras separadas:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isFairMember(fairId) {
      return signedIn()
        && exists(/databases/$(database)/documents/fairs/$(fairId))
        && get(/databases/$(database)/documents/fairs/$(fairId)).data.members[request.auth.uid] == true;
    }

    match /fairs/{fairId} {
      allow create: if signedIn()
        && request.resource.data.ownerId == request.auth.uid
        && request.resource.data.members[request.auth.uid] == true;
      allow read, update, delete: if signedIn()
        && resource.data.members[request.auth.uid] == true;

      match /{document=**} {
        allow read, write: if isFairMember(fairId);
      }
    }
  }
}
```

Evite publicar regras como `allow read, write: if true`. Nesta versão, cada feira fica em `fairs/{fairId}` e produtos/vendas ficam em subcoleções dessa feira.

## Cuidados para continuar no plano grátis

- Use `getDoc()` e `getDocs()` para ações pontuais.
- Evite `onSnapshot()` em telas que não precisam de tempo real.
- Use `limit()` nas queries. Os services já aplicam limites.
- Busque vendas por `dateKey`, nunca a coleção inteira.
- Sincronize manualmente apenas quando precisar atualizar outro aparelho.
- Não ative TTL deletes, PITR, backups, restore ou clone.
- Não adicione Cloud Functions nesta versão.
- Exporte relatórios localmente quando possível.
- Monitore leituras/escritas no Firebase Console durante os dias de uso.
