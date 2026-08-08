import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'cs', 'ru', 'uk'];

export default getRequestConfig(async (args) => {
  let locale = args.locale;
  if (!locale && (args as any).requestLocale) {
    locale = await (args as any).requestLocale;
  }
  
  if (!locale) {
    throw new Error(`Locale is completely missing! Args: ${JSON.stringify(args)}`);
  }
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    throw new Error(`Invalid locale passed to getRequestConfig: "${locale}". Expected one of: ${locales.join(', ')}`);
  }

  let messages;
  switch (locale) {
    case 'en':
      messages = (await import('./dictionaries/en.json')).default;
      break;
    case 'cs':
      messages = (await import('./dictionaries/cs.json')).default;
      break;
    case 'uk':
      messages = (await import('./dictionaries/uk.json')).default;
      break;
    case 'ru':
    default:
      messages = (await import('./dictionaries/ru.json')).default;
      break;
  }

  return {
    locale: locale as string,
    messages
  };
});
