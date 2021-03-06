/*
	Request handlers
*/

const _data = require("./data");
const helpers = require("./helpers");

const handlers = {};

handlers.users = (data, cb) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, cb);
  } else {
    cb(405);
  }
};

handlers._users = {};

handlers._users.post = (data, cb) => {
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;

  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  const tosAgreement =
    typeof data.payload.tosAgreement == "boolean" &&
    data.payload.tosAgreement == true
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    _data.read("users", phone, (err, data) => {
      if (err) {
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement: true
          };

          _data.create("users", phone, userObject, err => {
            if (!err) {
              cb(200);
            } else {
              console.log(err);
              cb(500, { Error: "Could not create the new user" });
            }
          });
        } else {
          cb(500, { Error: "Could not hash the users password" });
        }
      } else {
        cb(400, { Error: "A user with that phone number already exists" });
      }
    });
  } else {
    cb(400, { Error: "Missing required fields" });
  }
};

handlers._users.get = (data, cb) => {
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        _data.read("users", phone, (err, data) => {
          if (!err && data) {
            delete data.hashedPassword;
            cb(200, data);
          } else {
            cb(404);
          }
        });
      } else {
        cb(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

handlers._users.put = (data, cb) => {
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;

  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone) {
    if (firstName || lastName || password) {
      const token =
        typeof data.headers.token == "string" ? data.headers.token : false;

      handlers._tokens.verifyToken(token, phone, tokenIsValid => {
        if (tokenIsValid) {
          _data.read("users", phone, (err, userData) => {
            if (!err && userData) {
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hashedPassword(password);
              }
              _data.update("users", phone, userData, err => {
                if (!err) {
                  cb(200);
                } else {
                  console.log(err);
                  cb(500, { Error: "Could not update the user" });
                }
              });
            } else {
              cb(400, { Error: "The specified user does not exist" });
            }
          });
        } else {
          cb(403, {
            Error: "Missing required token in header, or token is invalid"
          });
        }
      });
    } else {
      cb(400, { Error: "Missing fields to update" });
    }
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

handlers._users.delete = (data, cb) => {
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
        _data.read("users", phone, (err, data) => {
          if (!err && data) {
            _data.delete("users", phone, err => {
              if (!err) {
                cb(200);
              } else {
                cb(500, { Error: "Could not delete the specified user" });
              }
            });
          } else {
            cb(404, { Error: "Could not find the specified user" });
          }
        });
      } else {
        cb(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

handlers.tokens = (data, cb) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, cb);
  } else {
    cb(405);
  }
};

handlers._tokens = {};

handlers._tokens.post = (data, cb) => {
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone && password) {
    _data.read("users", phone, (err, userData) => {
      if (!err && userData) {
        const hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          const tokenId = helpers.createRandomString(20);

          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires
          };

          _data.create("tokens", tokenId, tokenObject, err => {
            if (!err) {
              cb(200, tokenObject);
            } else {
              cb(500, { Error: "Could not create the new token" });
            }
          });
        } else {
          cb(400, {
            Error: "Password did not match the specified users stored password"
          });
        }
      } else {
        cb(400, { Error: "Could not find the specified user" });
      }
    });
  } else {
    cb(400, { Error: "Missing required fields" });
  }
};

handlers._tokens.get = (data, cb) => {
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        cb(200, tokenData);
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { Error: "Missing required fields" });
  }
};

handlers._tokens.put = (data, cb) => {
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;
  const extend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? true
      : false;

  if (id && extend) {
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          _data.update("tokens", id, tokenData, err => {
            if (!err) {
              cb(200);
            } else {
              cb(500, { Error: "Could not update the tokens expiration" });
            }
          });
        } else {
          cb(400, {
            Error: "The token has already expired, and cannot be extended"
          });
        }
      } else {
        cb(400, { Error: "Specified token does not exist" });
      }
    });
  } else {
    cb(400, { Error: "Missing required fields or fields are invalid" });
  }
};

handlers._tokens.delete = (data, cb) => {
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    _data.read("tokens", id, (err, data) => {
      if (!err && data) {
        _data.delete("tokens", id, err => {
          if (!err) {
            cb(200);
          } else {
            cb(500, { Error: "Could not delete the specified token" });
          }
        });
      } else {
        cb(404, { Error: "Could not find the specified token" });
      }
    });
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

handlers._tokens.verifyToken = (id, phone, cb) => {
  _data.read("tokens", id, (err, tokenData) => {
    if (!err && tokenData) {
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        cb(true);
      } else {
        cb(false);
      }
    } else {
      cb(false);
    }
  });
};

handlers.ping = (data, cb) => {
  cb(200);
};

handlers.notFound = (data, cb) => {
  cb(404);
};

module.exports = handlers;
