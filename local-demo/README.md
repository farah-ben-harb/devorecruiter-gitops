# Démonstration DevoRecruiter locale

Cette variante conserve les manifests Azure existants et ajoute uniquement une
surcouche locale pour un cluster Kubernetes `kind` exécuté par Docker Desktop.

## Accès

- Application : <http://devorecruiter.127.0.0.1.nip.io>
- API BFF : <http://api.devorecruiter.127.0.0.1.nip.io/health>
- Argo CD : <http://argocd.devorecruiter.127.0.0.1.nip.io>
- n8n : <http://n8n.devorecruiter.127.0.0.1.nip.io>

Les domaines `nip.io` ci-dessus se résolvent automatiquement vers `127.0.0.1`.
Ils évitent de modifier le fichier Windows `hosts`.

## Intégrations externes

Le cluster et les services démarrent sans secrets externes, mais les fonctions
suivantes demandent de reconnecter les comptes du nouveau contexte de démo :

- Google OAuth pour la connexion utilisateur ;
- Groq, Gemini, OpenRouter et ConvertAPI pour les fonctions IA concernées ;
- le nouveau tenant d'essai Dynatrace pour la télémétrie.

Ne pas placer ces valeurs dans Git. Mettre à jour les Secrets Kubernetes locaux
et les variables privées de `tools/mcp-infra/.env`.

## Contrôle rapide

```powershell
kubectl --context kind-devorecruiter-local get pods -n devorecruiter-dev
kubectl --context kind-devorecruiter-local get applications -n argocd
```

Pour lire le mot de passe administrateur Argo CD local :

```powershell
$encoded = kubectl --context kind-devorecruiter-local `
  get secret argocd-initial-admin-secret -n argocd `
  -o jsonpath='{.data.password}'
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded))
```

Le nom d'utilisateur est `admin`.

## Scénario MCP de démonstration

1. État initial en lecture seule :

   > Liste les applications Argo CD et indique leur état de synchronisation et de santé.

2. Synchronisation contrôlée :

   > Fais un dry-run de la synchronisation de `devorecruiter-frontend-dev`, puis synchronise-la et confirme son état final.

3. Opération Kubernetes :

   > Liste les pods du namespace `devorecruiter-dev`, redémarre le déploiement `devorecruiter-api-bff`, puis surveille le rollout jusqu'à ce qu'il soit prêt.

4. Diagnostic :

   > Affiche les événements récents du namespace `devorecruiter-dev` et résume uniquement les anomalies.

Les opérations de mutation doivent rester limitées au projet et au namespace
autorisés dans `tools/mcp-infra/.env`.

## Reconnexion après un redémarrage

1. Démarrer Docker Desktop.
2. Vérifier le contexte avec `kubectl config use-context kind-devorecruiter-local`.
3. Vérifier les pods avec la commande de contrôle rapide ci-dessus.
4. Ouvrir les quatre URL de la section **Accès**.
