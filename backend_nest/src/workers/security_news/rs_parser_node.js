// Node.js version using xmldom
const { DOMParser } = require('@xmldom/xmldom');

// Base interface for all RSS adapters
class RSSAdapter {
  parse(data) {
    throw new Error('parse() must be implemented by adapter');
  }
}

// Adapter for BleepingComputer RSS format
class BleepingComputerAdapter extends RSSAdapter {
  parse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const channel = xmlDoc.getElementsByTagName('channel')[0];
    const items = xmlDoc.getElementsByTagName('item');

    const getElementText = (parent, tagName, namespace = null) => {
      const elements = namespace
        ? parent.getElementsByTagNameNS(namespace, tagName)
        : parent.getElementsByTagName(tagName);
      return elements[0]?.textContent || '';
    };

    return {
      feed: {
        title: getElementText(channel, 'title'),
        link: getElementText(channel, 'link'),
        description: getElementText(channel, 'description'),
        pubDate: getElementText(channel, 'pubDate'),
        language: getElementText(channel, 'language'),
      },
      items: Array.from(items).map((item) => {
        const pubDate = getElementText(item, 'pubDate');
        return {
          title: getElementText(item, 'title'),
          link: getElementText(item, 'link'),
          pubDate: pubDate,
          epochDate: pubDate ? new Date(pubDate).getTime() : null,
          author: getElementText(
            item,
            'creator',
            'http://purl.org/dc/elements/1.1/',
          ),
          categories: Array.from(item.getElementsByTagName('category')).map(
            (cat) => cat.textContent.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
          ),
          guid: getElementText(item, 'guid'),
          description: getElementText(item, 'description')
            .replace(/<!\[CDATA\[|\]\]>/g, '')
            .trim(),
        };
      }),
    };
  }
}

// Adapter for SecurityWeek RSS format
class SecurityWeekAdapter extends RSSAdapter {
  parse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const channel = xmlDoc.getElementsByTagName('channel')[0];
    const items = xmlDoc.getElementsByTagName('item');

    const getElementText = (parent, tagName, namespace = null) => {
      const elements = namespace
        ? parent.getElementsByTagNameNS(namespace, tagName)
        : parent.getElementsByTagName(tagName);
      return elements[0]?.textContent || '';
    };

    return {
      feed: {
        title: getElementText(channel, 'title'),
        link: getElementText(channel, 'link'),
        description: getElementText(channel, 'description'),
        pubDate:
          getElementText(channel, 'lastBuildDate') ||
          getElementText(channel, 'pubDate'),
        language: getElementText(channel, 'language'),
      },
      items: Array.from(items).map((item) => {
        const pubDate = getElementText(item, 'pubDate');
        return {
          title: getElementText(item, 'title'),
          link: getElementText(item, 'link'),
          pubDate: pubDate,
          epochDate: pubDate ? new Date(pubDate).getTime() : null,
          author: getElementText(
            item,
            'creator',
            'http://purl.org/dc/elements/1.1/',
          ),
          categories: Array.from(item.getElementsByTagName('category')).map(
            (cat) => cat.textContent.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
          ),
          guid: getElementText(item, 'guid'),
          description: getElementText(item, 'description')
            .replace(/<!\[CDATA\[|\]\]>/g, '')
            .replace(/<[^>]*>/g, '')
            .trim(),
        };
      }),
    };
  }
}

// Adapter for The Record RSS format
class TheRecordAdapter extends RSSAdapter {
  parse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const channel = xmlDoc.getElementsByTagName('channel')[0];
    const items = xmlDoc.getElementsByTagName('item');

    const getElementText = (parent, tagName, namespace = null) => {
      const elements = namespace
        ? parent.getElementsByTagNameNS(namespace, tagName)
        : parent.getElementsByTagName(tagName);
      return elements[0]?.textContent || '';
    };

    return {
      feed: {
        title: getElementText(channel, 'title'),
        link: getElementText(channel, 'link'),
        description: getElementText(channel, 'description'),
        pubDate:
          getElementText(channel, 'lastBuildDate') ||
          getElementText(channel, 'pubDate'),
        language: getElementText(channel, 'language'),
      },
      items: Array.from(items).map((item) => {
        const pubDate = getElementText(item, 'pubDate');
        return {
          title: getElementText(item, 'title'),
          link: getElementText(item, 'link'),
          pubDate: pubDate,
          epochDate: pubDate ? new Date(pubDate).getTime() : null,
          author: getElementText(
            item,
            'creator',
            'http://purl.org/dc/elements/1.1/',
          ),
          categories: Array.from(item.getElementsByTagName('category')).map(
            (cat) => cat.textContent.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
          ),
          guid: getElementText(item, 'guid'),
          description: getElementText(item, 'description')
            .replace(/<!\[CDATA\[|\]\]>/g, '')
            .replace(/<[^>]*>/g, '')
            .trim(),
        };
      }),
    };
  }
}

// Example adapter for standard RSS format
class StandardRSSAdapter extends RSSAdapter {
  parse(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    const channel = xmlDoc.getElementsByTagName('channel')[0];
    const items = xmlDoc.getElementsByTagName('item');

    const getElementText = (parent, tagName) => {
      const elements = parent.getElementsByTagName(tagName);
      return elements[0]?.textContent || '';
    };

    return {
      feed: {
        title: getElementText(channel, 'title'),
        link: getElementText(channel, 'link'),
        description: getElementText(channel, 'description'),
        pubDate: getElementText(channel, 'pubDate'),
        language: getElementText(channel, 'language'),
      },
      items: Array.from(items).map((item) => {
        const pubDate = getElementText(item, 'pubDate');
        return {
          title: getElementText(item, 'title'),
          link: getElementText(item, 'link'),
          pubDate: pubDate,
          epochDate: pubDate ? new Date(pubDate).getTime() : null,
          author: getElementText(item, 'author'),
          categories: Array.from(item.getElementsByTagName('category')).map(
            (cat) => cat.textContent.trim(),
          ),
          guid: getElementText(item, 'guid'),
          description: getElementText(item, 'description'),
        };
      }),
    };
  }
}

// Main parser that uses adapters
class RSSParser {
  constructor(adapter) {
    this.adapter = adapter;
  }

  setAdapter(adapter) {
    this.adapter = adapter;
  }

  parse(data) {
    if (!this.adapter) {
      throw new Error('No adapter set');
    }
    return this.adapter.parse(data);
  }
}

// Factory to auto-detect and create appropriate adapter
class RSSAdapterFactory {
  static createAdapter(xmlString) {
    // Detect BleepingComputer
    if (
      xmlString.includes('BleepingComputer') ||
      xmlString.includes('bleepingcomputer.com')
    ) {
      return new BleepingComputerAdapter();
    }
    // Detect SecurityWeek
    if (
      xmlString.includes('SecurityWeek') ||
      xmlString.includes('securityweek.com')
    ) {
      return new SecurityWeekAdapter();
    }
    // Detect The Record
    if (
      xmlString.includes('The Record by Recorded Future') ||
      xmlString.includes('therecord.media')
    ) {
      return new TheRecordAdapter();
    }
    // Default to standard RSS
    return new StandardRSSAdapter();
  }
}

module.exports = {
  RSSParser,
  RSSAdapter,
  BleepingComputerAdapter,
  SecurityWeekAdapter,
  TheRecordAdapter,
  StandardRSSAdapter,
  RSSAdapterFactory,
};
