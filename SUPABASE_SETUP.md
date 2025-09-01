# Guide de configuration Supabase

## 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez sur "New Project"
3. Choisissez votre organisation
4. Donnez un nom à votre projet (ex: "location-materiel-av")
5. Créez un mot de passe fort pour la base de données
6. Choisissez une région proche de vos utilisateurs
7. Cliquez sur "Create new project"

## 2. Récupérer les clés API

1. Dans votre projet Supabase, allez dans **Settings** → **API**
2. Copiez les valeurs suivantes :

```
Project URL → NEXT_PUBLIC_SUPABASE_URL
anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY  
service_role secret → SUPABASE_SERVICE_ROLE_KEY
```

## 3. Créer les tables

1. Dans Supabase, allez dans **SQL Editor**
2. Copiez le contenu du fichier `supabase-schema.sql`
3. Collez-le dans l'éditeur SQL
4. Cliquez sur **Run** pour exécuter le script

## 4. Configurer l'authentification

1. Allez dans **Authentication** → **Settings**
2. Configurez les paramètres suivants :

### Site URL
```
http://localhost:3000 (pour le développement)
https://votre-domaine.com (pour la production)
```

### Redirect URLs
```
http://localhost:3000/auth/callback
https://votre-domaine.com/auth/callback
```

### Providers
- Activez **Email** si vous voulez l'authentification par email
- Configurez **Google** ou **GitHub** si nécessaire

## 5. Créer un utilisateur admin

1. Allez dans **Authentication** → **Users**
2. Cliquez sur **Add user**
3. Entrez un email et un mot de passe
4. Cliquez sur **Create user**

## 6. Tester la connexion

1. Créez votre fichier `.env.local` avec les clés
2. Lancez votre application : `npm run dev`
3. Allez sur `http://localhost:3000/auth/login`
4. Testez la connexion avec l'utilisateur créé

## 7. Test final

1. Vérifiez que toutes les tables sont créées
2. Testez l'authentification
3. Testez la création d'une réservation
4. Vérifiez que les données s'affichent correctement

Votre application est maintenant connectée à Supabase ! 🎉
