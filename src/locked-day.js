export function lockedDayMessage(language, days) {
  const messages = {
    ru: () => days === 1 ? 'Приходи завтра' : days === 2 ? 'Приходи послезавтра' : `Приходи через ${days} ${new Intl.PluralRules('ru').select(days) === 'few' ? 'дня' : 'дней'}`,
    en: () => days === 1 ? 'Come back tomorrow' : days === 2 ? 'Come back the day after tomorrow' : `Come back in ${days} days`,
    fr: () => days === 1 ? 'Reviens demain' : days === 2 ? 'Reviens après-demain' : `Reviens dans ${days} jours`,
    ar: () => days === 1 ? 'عُد غدًا' : days === 2 ? 'عُد بعد غد' : `عُد بعد ${days} أيام`,
    hi: () => days === 1 ? 'कल फिर आना' : days === 2 ? 'परसों फिर आना' : `${days} दिन बाद फिर आना`,
  };
  return (messages[language] || messages.en)();
}
