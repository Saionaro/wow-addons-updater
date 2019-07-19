const fs = require('fs');
const path = require('path');
const request = require('request');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip');

const PREFIX = "https://www.curseforge.com";

const log = require('../utils/logger.js');
// https://www.curseforge.com/wow/addons/aptechka/files
const removeFile = path =>
  new Promise((res, rej) => {
    fs.unlink(path, err => {
      if (err) {
        return rej(err);
      }
      res();
    });
  });

const unzip = (path, destination) =>
  new Promise((res, rej) => {
    new AdmZip(path)
      .extractAllToAsync(destination, true, err => {
        if (err) {
          return rej(err);
        }
        removeFile(path)
          .then(res)
          .catch(rej);
      });
  });

const downloadFile = (title, url, tempPath) => {
  log(`Download ${url}`);
  const zipPath = path.join(tempPath, `${title}.zip`);
  return new Promise(res => {
    request(url)
      .pipe(fs.createWriteStream(zipPath))
      .on('finish', () => {
        res(zipPath);
      });
  });
};

const getZipUrl = url => {
  return new Promise((res, rej) => {
    request(url, (err, response, body) => {
      if (err) {
        return rej(err);
      }

      const bodyContent = cheerio.load(body);
      const rows = bodyContent('.listing-project-file tr');

      const needsRow = Array.prototype.find.call(rows, (item) => {
        const rowContent = cheerio.load(item);
        const tds = rowContent('td');
  
        const versionType = tds.eq(0).text().trim();
  
        if (versionType !== "R") {
          return false;
        }
  
        const gameVersion = tds.eq(4).text().trim();
  
        if (parseInt(gameVersion, 10) < 8) {
          return false;
        }
  
        return true;
      });

      const needsRowContent = cheerio.load(needsRow);
      const td = needsRowContent('td').last()
      const tdContent = cheerio.load(td.html());
      const url = tdContent("a").eq(0).attr('href').trim();

      res(`${PREFIX}${url}/file`);
    });
  });
};

const buildCurseUrl = title =>
  `https://www.curseforge.com/wow/addons/${title}/files`;

function loadAddon(instance, event, data) {
  const {
    addonData: {
      title,
      archiveUrl,
      addonToken,
    },
    addonsDirectory,
    uuid,
  } = data;
  log('Get data for ' + title);

  getZipUrl(archiveUrl || buildCurseUrl(addonToken || title))
    .then(url => {


      return downloadFile(title, url, instance.tempPath);
    })
    .then(path => {
      return unzip(path, addonsDirectory);
    })
    .then(() => {
      log('Done');
      instance.window.webContents.send('answer/get-addon-data', {
        uuid,
        fail: false,
        data: {}
      });
    })
    .catch(err => {
      log('Caused error', err);
      instance.window.webContents.send('answer/get-addon-data', {
        uuid,
        fail: true,
        error: err
      });
    })
}

module.exports = function(instance) {
  return loadAddon.bind(null, instance);
};
