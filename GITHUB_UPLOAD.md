# رفع صدام الأفكار إلى GitHub Pages

## ما الذي أرفعه؟

استخدم ملف `samra-game-redesign-github-pages.zip` إذا كان هدفك تشغيل الموقع فوراً. فك ضغطه ثم ارفع **محتويات** المجلد إلى جذر المستودع، بحيث يكون ملف `index.html` في الجذر وليس داخل مجلد إضافي.

بعد الرفع، افتح إعدادات المستودع في GitHub ثم انتقل إلى **Settings → Pages**. اختر النشر من الفرع `main` ومن المجلد `/ (root)`، ثم احفظ التغيير. سيعطيك GitHub رابط الموقع بعد اكتمال النشر.

## روابط الاستخدام

افتح رابط الموقع العادي على الشاشة الكبيرة. لفتح لوحة المقدم أضف `?mode=presenter` إلى نهاية الرابط. مثال:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?mode=presenter`

تستطيع عزل كل فعالية بإضافة اسم غرفة أيضاً، مثل:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?mode=presenter&room=school-final`

## تعديل الكود لاحقاً

تحتوي حزمة `samra-game-redesign-source.zip` على مشروع React/Vite الكامل. بعد تعديل المصدر شغّل `pnpm install` ثم `pnpm build`، وارفع محتويات `dist/public` الجديدة إلى GitHub Pages.

> لا تغيّر اسم `questions.json` ولا تنقله من جذر النسخة المنشورة، لأن لوحة المقدم تحمّل بنك الأسئلة من هذا المسار.
