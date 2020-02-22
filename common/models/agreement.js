module.exports = function(Agreement) {
  Agreement.latest = async function (agreementType, req, res) {
    try {
      const agreement = await getLatestAgreement(agreementType);

      if (agreement) {
        return Promise.resolve(agreement);
      }

      res.status(404);

      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  Agreement.remoteMethod('latest', {
    accepts: [
      {
        arg: 'type',
        type: 'string',
        reqired: true,
      },
      {
        arg: 'req',
        type: 'object',
        http: {
          source: 'req',
        },
      },
      {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res',
        },
      },
    ],
    http: {
      verb: 'get',
      path: '/:type/latest',
    },
    returns: {
      root: true,
    },
  });

  Agreement.getAllAgreementsWithActionRequired = async function (requestOptions, res) {
    if (!requestOptions.accessToken) {
      return Promise.resolve([]);
    }
    
    const userId = requestOptions.accessToken.userId;

    try {
      const privacy = {
        agreement: await getLatestAgreement('privacy'),
        consent: await getLatestConsent('privacy', userId),
      };

      const terms = {
        agreement: await getLatestAgreement('terms'),
        consent: await getLatestConsent('terms', userId),
      };

      let actionRequired = [];

      if (!privacy.consent) {
        actionRequired.push({
          agreementType: 'privacy',
          agreement: privacy.agreement,
          reason: 'missing',
        });
      }

      if (privacy.consent && privacy.consent.agreementId !== privacy.agreement.id) {
        actionRequired.push({
          agreementType: 'privacy',
          agreement: privacy.agreement,
          reason: 'update',
        });
      }

      if (!terms.consent) {
        actionRequired.push({
          agreementType: 'terms',
          agreement: terms.agreement,
          reason: 'missing',
        });
      }

      if (terms.consent && terms.consent.agreementId !== terms.agreement.id) {
        actionRequired.push({
          agreementType: 'terms',
          agreement: terms.agreement,
          reason: 'update',
        });
      }

      return actionRequired;
    } catch (error) {
      return Promise.reject(error);
    }
  };

  Agreement.remoteMethod('getAllAgreementsWithActionRequired', {
    accepts: [
      {
        arg: 'options',
        type: 'object',
        http: 'optionsFromRequest',
      },
      {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res',
        },
      },
    ],
    http: {
      verb: 'get',
      path: '/require-action',
    },
    returns: {
      root: true,
    },
  });

  async function getLatestAgreement(agreementType) {
    const agreement = await Agreement.findOne({
      where: {
        and: [
          {
            status: 'published',
          },
          {
            validityStartDate: {
              lte: Date.now(),
            },
          },
          {
            type: agreementType,
          },
        ],
      },
      order: 'validityStartDate DESC',
    });

    return agreement;
  }

  async function getLatestConsent(agreementType, userId) {
    const Consent = Agreement.app.models.Consent;

    const consent = await Consent.findOne({
      where: {
        and: [
          {
            userId: userId,
          },
          {
            agreementType: agreementType,
          },
        ],
      },
      order: 'createdAt DESC',
    });

    return consent;
  }
};
