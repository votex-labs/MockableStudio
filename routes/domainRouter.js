const express = require("express");
const domainRouter = express.Router();
const Database = require("../framework/db");
const Server = require("../framework/server");
const Logger = require("../framework/logger");
const { getPublicIP } = require('../framework/utils');
const { HOST} = require('../config');

// view domains
domainRouter.get("/",async function (req, res) {
  const IP = HOST ? HOST : await getPublicIP();
  let domains = null;
  try {
    domains = Database.getAllDomains();
    Logger.info(`Load Domains : ${JSON.stringify(domains)}`);
  } catch (error) {
    Logger.error(`Retrive Domain Data {Error: ${error}}`);
  }
  const status = Server().status;

  res.render("domain/viewDomain", {
    domains,
    status,
    ip: IP,
    port: Server().port
  });
});

domainRouter.post("/add", function(req, res) {
  try {
    let name = req.body.domainName;
    if (name === "") throw new Error("Neme is null");
    name = name.startsWith("/") ? name : `/${name}`;
    Database.addDomain(name);
    Logger.info(`Domain Saved {name: ${name}}`);
  } catch (error) {
    Logger.error(`Domain Registration Error ${error}`);
  }
  res.redirect("/domain");
});

domainRouter.get("/edit/:domainId", async function (req, res) {
  const IP = HOST ? HOST : await getPublicIP();
  try {
    const domainId = req.params.domainId;
    const domain = Database.getDomainFromId(domainId);
    const domains = Database.getAllDomains();
    const params = {
      domains,
      editable: domain,
      id: domainId,
      ip: IP,
      status: Server().status,
      port: Server().port
    };
    res.render("domain/viewDomain", params);
    Logger.info(`Domain Edit View Loaded {name: ${JSON.stringify(params)}}`);
  } catch (error) {
    Logger.error(`Domain Edit View Loaded Error ${error}`);
    res.redirect("/domain");
  }
});

domainRouter.post("/edit/:domainId", function(req, res) {
  const domainId = req.params.domainId;
  let name = req.body.domainName;
  name = name.startsWith("/") ? name : `/${name}`;
  try {
    const domain = Database.getDomainFromId(domainId);
    const domainName = domain.domain;
    if (domain.paths.length > 0) {
      domain.paths.forEach(function(path) {
        Server().removeRoute(`${domainName}${path.path}`, path.method);
      });

      domain.paths.forEach(function(path) {
        Server().createEndpoint(name, path);
      });
    }
    Database.updateDomaiName(domainId, name);

    Logger.info(`Domain Edited {Id: ${domainId}, current name:${name} }`);
  } catch (error) {
    Logger.error(`Domain Edited Error {id : ${domainId}, error ${error}}`);
  }
  res.redirect("/domain");
});

domainRouter.get("/delete/:domainId", function(req, res) {
  const domainId = req.params.domainId;
  try {
    const domain = Database.getDomainFromId(domainId);
    const domainName = domain.domain;
    if (domain.paths.length > 0) {
      domain.paths.forEach(function(path) {
        Server().removeRoute(`${domainName}${path.path}`, path.method);
      });
    }
    Database.deleteDomain(domainId);
    Logger.info(`Domain Deleted {Id: ${domainId}}`);
  } catch (error) {
    Logger.error(`Domain Deleted Error {id : ${domainId}}, error:${error}`);
  }
  res.redirect("/domain");
});

domainRouter.get("/restart", async function(req, res) {
  await Server().restart();
  res.redirect("/domain");
});

domainRouter.get("/stop", async function(req, res) {
  await Server().stop();
  res.redirect("/domain");
});

module.exports = domainRouter;
