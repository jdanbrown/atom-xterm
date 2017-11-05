'use babel';

import consistentEnv from 'consistent-env';
import osLocale from 'os-locale';

function guessLang() {
  if (consistentEnv().LANG) {
    return consistentEnv().LANG;
  }

  // let's try and nastily guess the locale/lang
  let locale = osLocale.sync();
  if (!locale.match(/\.[-\w]+$/)) {
    locale = `${locale}.UTF-8`;
  }
  console.warn(
    `xterm: LANG wasn’t set. I tried to guess it, and terminals will be using ‘${locale}’. If this looks bad, and your terminals do weird things with special characters, this is why – in this case, please open a ticket at https://github.com/dwb/atom-xterm/issues/new`,
  );
  return locale;
}

const LANG = guessLang();
export default LANG;
