# Einrichtung: Stripe und Newsletter

Alles, was nur Schayan machen kann, in der Reihenfolge, in der es gemacht werden muss.
Technisch ist beides fertig — hier werden nur noch Konten angelegt und Werte eingetragen.

Die Zeitangaben sind ohne Wartezeiten (Stripe-Verifizierung, DNS).

---

## Teil 1 — Stripe (~30 Minuten, plus Kontofreischaltung)

### 1.1 Konto

1. `stripe.com` → **Sign up** → mit `schayan@yousefian.de`.
2. Nach dem Login oben rechts der Schalter **Test mode**. Der bleibt vorerst **an**.
3. Für echte Zahlungen später: **Activate payments** ausfüllen — Rechtsform, Adresse,
   Steuernummer/USt-IdNr., IBAN, Ausweis. Das dauert bei Stripe meist Minuten bis wenige Tage.
   Solange das nicht durch ist, funktioniert ausschließlich der Test-Modus.

### 1.2 Der 99-€-Link

1. `dashboard.stripe.com/payment-links/create`
2. **+ Add a new product**
   - Name: `Evidence package — one molecule`
   - Beschreibung: `Every cohort where a drug that failed shares your molecule's target: the
     molecules, the trials, what stopped each one, and the trials that ran to the end and missed.`
   - **Amount**: `99` · **Currency**: `EUR` · **One time** (nicht recurring)
   - **Add product**
3. Im Abschnitt **Options**:
   - **Collect customer names** → **Business name** anhaken. Das ist die Firma, die wir sonst im
     Formular erfragen.
   - **Let customers adjust quantity** → **aus** lassen. Eine Bestellung ist ein Molekül.
   - **Limit the number of payments** → **aus** lassen. Der Link wird von allen Käufern benutzt.
4. Reiter **After payment** → **Don't show confirmation page** → **Redirect customers to your
   website** → exakt das hier eintragen, mit den geschweiften Klammern:

   ```
   https://clinicaltrialfailures.com/access?session={CHECKOUT_SESSION_ID}
   ```

   Das ist der wichtigste Wert auf dieser Seite. Ohne ihn landet ein zahlender Kunde auf einer
   Seite, die ihn nicht wiedererkennt.
5. **Create link** → die URL (`https://buy.stripe.com/…`) kopieren und zwischenspeichern.

### 1.3 Der 999-€-Link

Dasselbe noch einmal, mit:

- Name: `Full access — every package, one year`
- **Amount**: `999` · **EUR` · **Recurring** → **Yearly**
- gleiche Redirect-URL wie oben

Dieser Link wird von der Seite aus *nicht* automatisch verkauft — `/api/order` vergibt immer die
Molekül-Stufe. Er existiert, damit du ihn jemandem direkt schicken kannst.

### 1.4 Der Webhook

1. `dashboard.stripe.com/webhooks` → **Add endpoint** (je nach Stand der Oberfläche unter
   **Developers → Webhooks** oder **Workbench → Webhooks**).
2. **Endpoint URL**: `https://clinicaltrialfailures.com/api/stripe`
3. **Select events** → nur dieses eine: **`checkout.session.completed`**
4. **Add endpoint**
5. Auf der Detailseite bei **Signing secret** auf **Reveal** klicken → `whsec_…` kopieren.

### 1.5 Die drei Werte nach Cloudflare — nicht nach GitHub

Die Seite wird von Cloudflare selbst gebaut und deployt, GitHub Actions baut nur zur Kontrolle
mit. Laufzeit-Konfiguration gehört deshalb an den Worker.

1. `dash.cloudflare.com` → **Workers & Pages** (je nach Stand **Compute**) → Worker
   **`oncology-trial-failures`**
2. **Settings** → **Variables and Secrets** → **Add**
3. Dreimal, jedes Mal **Type: Secret**:

   | Variable name | Value |
   |---|---|
   | `STRIPE_LINK_PACKAGE` | der 99-€-Link aus 1.2 |
   | `STRIPE_LINK_ACCESS` | der 999-€-Link aus 1.3 |
   | `STRIPE_WEBHOOK_SECRET` | das `whsec_…` aus 1.4 |

4. **Deploy** klicken.

Alle drei als **Secret**, auch die beiden Links, die überhaupt nicht geheim sind: Secrets
überleben ein Deployment garantiert, einfache Variablen nicht unbedingt. Verschwindet ein Link
beim nächsten Release, wird ab da wieder alles verschenkt, ohne Fehlermeldung.

Wirkt sofort, ohne Deployment.

### 1.6 Einmal durchspielen

1. `clinicaltrialfailures.com/asset-check` → `osimertinib` eingeben
2. Unten im Kasten Arbeits-E-Mail und Firma → **Get them**
3. Der Knopf heißt jetzt **Pay €99 and open it** → klicken
4. Testkarte: `4242 4242 4242 4242`, beliebiges künftiges Ablaufdatum, beliebige CVC/PLZ
5. Erwartet: Weiterleitung auf `/access`, kurz "Waiting for your payment to confirm", dann öffnet
   sich die Bibliothek und die Adresszeile wechselt auf `?token=…`
6. Kontrolle in Stripe: **Webhooks** → der Versuch steht auf **200**

### 1.7 Scharf schalten

1. **Test mode** ausschalten.
2. 1.2, 1.3 und 1.4 im Live-Modus **noch einmal** machen — Links und Signing Secret sind im
   Live-Modus andere Werte.
3. Die drei Cloudflare-Secrets mit den Live-Werten überschreiben.

Solange Test-Werte eingetragen sind, kann niemand echt bezahlen: ein Test-Link nimmt nur
Testkarten an.

---

## Teil 2 — Newsletter (~20 Minuten, plus DNS)

### 2.1 Cloudflare-Token für KV

Die Abonnentenliste und das, was auf die nächste Mail wartet, liegen in Cloudflare KV. Der
Workflow braucht dafür einen Token.

1. `dash.cloudflare.com` → oben rechts auf das Profilbild → **My Profile**
2. **API Tokens** → **Create Token** → ganz unten **Create Custom Token** → **Get started**
3. **Token name**: `clinicaltrialfailures newsletter KV`
4. **Permissions**: `Account` · `Workers KV Storage` · **`Edit`**
   (Edit, nicht Read — zwischen zwei Läufen wird geschrieben.)
5. **Account Resources**: `Include` · dein Account
6. **Continue to summary** → **Create Token** → kopieren. Der Wert wird nur ein einziges Mal
   angezeigt.

### 2.2 In GitHub hinterlegen

1. `github.com/ThorfinnThor/oncology-trial-failures` → **Settings**
2. links **Secrets and variables** → **Actions**
3. **New repository secret** → Name `CF_API_TOKEN` → Wert einfügen → **Add secret**

### 2.3 Brevo-Konto und Domain

1. `brevo.com` → **Sign up free** (300 Mails/Tag reichen um Größenordnungen).
2. Oben rechts Kontomenü → **Senders, Domains & Dedicated IPs** → Reiter **Domains** →
   **Add a domain** → `clinicaltrialfailures.com` → **Authenticate this domain**.
3. Brevo zeigt jetzt mehrere DNS-Einträge an (ein `brevo-code`-TXT, DKIM als
   `mail._domainkey`-TXT, meist noch DMARC). **Genau die nehmen, die dort stehen** — nicht die aus
   irgendeiner Anleitung.

### 2.4 Die Einträge in Cloudflare setzen

1. `dash.cloudflare.com` → Domain **clinicaltrialfailures.com** → **DNS** → **Records**
2. Pro Eintrag: **Add record** → Type wie angegeben → **Name**: nur den vorderen Teil eintragen
   (`mail._domainkey`, nicht die ganze Domain; bei `@` einfach `@` lassen) → **Content**: der Wert
   von Brevo → TTL **Auto** → **Save**.
3. **Falls ein Eintrag ein CNAME ist: Proxy auf DNS only stellen** (graue Wolke, nicht orange).
   Proxy und Mail vertragen sich nicht.
4. **Achtung SPF:** Pro Domain darf es genau **einen** SPF-TXT-Eintrag geben. Existiert schon
   einer, wird der Brevo-`include:` in die *bestehende* Zeile aufgenommen, statt eine zweite
   anzulegen. Zwei SPF-Einträge sind schlechter als keiner.
5. Zurück in Brevo → **Verify** / **Authenticate**. Cloudflare-DNS ist meist sofort da.

### 2.5 Brevo-API-Key

1. In Brevo oben rechts Kontomenü → **SMTP & API** → Reiter **API keys**
2. **Generate a new API key** → Name `clinicaltrialfailures` → kopieren (`xkeysib-…`)
3. In GitHub wie in 2.2: **New repository secret** → Name `BREVO_API_KEY` → **Add secret**

### 2.6 Ein Postfach für contact@

Gesendet wird als `contact@clinicaltrialfailures.com`. Jemand wird antworten.

1. Cloudflare → Domain → **Email** → **Email Routing** → aktivieren
2. **Create address**: `contact` → weiterleiten an deine eigene Adresse
3. Cloudflare legt dafür MX- und TXT-Einträge an. Wenn dabei ein zweiter SPF-Eintrag entstehen
   würde: wieder zusammenführen, siehe 2.4.

### 2.7 Testen

1. Auf `clinicaltrialfailures.com/newsletter` selbst eintragen — bei null Abonnenten wird nichts
   verschickt.
2. `github.com/ThorfinnThor/oncology-trial-failures` → **Actions** → links **Update trial failure
   data** → rechts **Run workflow** → Branch `main` → **Run workflow**. Dauert 20–40 Minuten.
3. Unten im fertigen Lauf unter **Artifacts** liegt `newsletter-<id>`: das ist die Mail, die
   rausgegangen wäre. Erst lesen, dann jemandem schicken.
4. Verschickt wird erst, wenn seit der letzten Mail zwölf Tage vergangen sind. Sofort erzwingen:
   `python scripts/signals/newsletter.py --force` (lokal, mit gesetzten Secrets).

Wer eingetragen ist:

```bash
npx wrangler kv key list --namespace-id 0601b1ee829841bf90a3ce764b4d958d --prefix news:
```

---

## Was noch offen ist, bevor die erste Mail rausgeht

Die Anmeldung ist **Single Opt-in**: eine Adresse eintragen genügt, es wird keine Bestätigungsmail
verschickt. Für Werbemails an deutsche Empfänger ist Double Opt-in der etablierte Standard (UWG
§7, plus Nachweispflicht aus der DSGVO) — Single Opt-in ist angreifbar, und der Nachweis, dass
sich jemand selbst eingetragen hat, fehlt.

Das ist Entwicklungsarbeit, keine Klickarbeit: Anmeldung schreibt `pending:{token}`, Brevo
verschickt eine Bestätigungsmail, erst der Klick legt `news:{token}` an. Ich kann das bauen.
Ich bin kein Anwalt, und ob es für dich ein echtes Risiko ist, entscheidest du — aber ich würde
die erste Mail nicht ohne verschicken.
