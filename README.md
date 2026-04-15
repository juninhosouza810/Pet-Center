# 🐾 PetShop Pro — Guia de Deploy

## Estrutura de arquivos

```
petshop-pro/
├── src/
│   ├── main.jsx          ← entrada do React
│   ├── App.jsx           ← aplicacao completa
│   └── supabase.js       ← cliente Supabase
├── index.html
├── vite.config.js
├── package.json
├── vercel.json
├── .gitignore
├── .env.example          ← modelo do .env (nao enviar ao GitHub)
└── supabase_setup.sql    ← SQL para rodar no Supabase
```

---

## PARTE 1 — Configurar o Supabase (banco de dados)

### 1.1 Criar conta e projeto
1. Acesse https://supabase.com e clique em "Start your project"
2. Faca login com GitHub ou Google
3. Clique em "New Project"
4. Preencha:
   - **Name:** petshop-pro
   - **Database Password:** crie uma senha forte (guarde!)
   - **Region:** South America (Sao Paulo)
5. Clique "Create new project" e aguarde ~2 minutos

### 1.2 Criar a tabela
1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query**
3. Cole o conteudo do arquivo `supabase_setup.sql`
4. Clique em **Run** (ou Ctrl+Enter)
5. Deve aparecer "Success. No rows returned"

### 1.3 Pegar as credenciais
1. No menu lateral, clique em **Settings** (icone de engrenagem)
2. Clique em **API**
3. Copie:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon / public key** → chave longa começa com `eyJ...`

---

## PARTE 2 — Configurar o projeto localmente

### 2.1 Instalar Node.js (se nao tiver)
Baixe em https://nodejs.org (versao LTS)

### 2.2 Criar o arquivo .env
Na pasta `petshop-pro/`, crie um arquivo chamado `.env`:

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Substitua pelos valores copiados no passo 1.3

### 2.3 Instalar dependencias e testar localmente
```bash
cd petshop-pro
npm install
npm run dev
```
Abra http://localhost:5173 — o app deve funcionar!

---

## PARTE 3 — Publicar na Vercel

### 3.1 Subir para o GitHub
```bash
# Na pasta petshop-pro:
git init
git add .
git commit -m "PetShop Pro inicial"
```

Depois:
1. Acesse https://github.com/new
2. Crie um repositorio chamado `petshop-pro` (pode ser privado)
3. Copie os comandos que o GitHub mostra e execute no terminal:
```bash
git remote add origin https://github.com/SEU_USUARIO/petshop-pro.git
git branch -M main
git push -u origin main
```

### 3.2 Conectar com a Vercel
1. Acesse https://vercel.com e faca login com GitHub
2. Clique em **Add New Project**
3. Selecione o repositorio `petshop-pro`
4. A Vercel detecta automaticamente que e um projeto Vite
5. **ANTES de clicar Deploy**, clique em **Environment Variables**

### 3.3 Adicionar variaveis de ambiente na Vercel
Adicione as duas variaveis:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://SEU_PROJETO.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciO...` |

6. Clique **Deploy**
7. Aguarde ~1 minuto
8. Seu app estara em: `https://petshop-pro.vercel.app`

---

## Atualizacoes futuras

Para atualizar o app depois:
```bash
# Edite os arquivos, depois:
git add .
git commit -m "descricao da mudanca"
git push
```
A Vercel faz o redeploy automaticamente!

---

## Problemas comuns

**Tela branca / erro no console:**
- Verifique se as variaveis de ambiente estao corretas na Vercel
- Abra o Supabase > Table Editor e confirme que a tabela `petshop_data` existe

**"supabaseUrl is required":**
- O arquivo `.env` nao foi criado ou as variaveis nao comecam com `VITE_`
- Variaveis na Vercel nao foram salvas corretamente

**Dados nao salvam:**
- No Supabase, va em Authentication > Policies e confirme que a policy "allow_all" existe na tabela `petshop_data`

---

## Seguranca

- O arquivo `.env` NUNCA vai para o GitHub (esta no .gitignore)
- A chave `anon` do Supabase e segura para ficar no frontend — o Supabase usa Row Level Security para proteger os dados
- A senha admin (`admin123`) pode ser alterada diretamente no `App.jsx` na funcao `TelaLogin`
