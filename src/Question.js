const inquirer = require('inquirer');

class Question{

    prompt(type, message, choices = [], name = "test"){
        return new Promise((resolve, reject) => {
            inquirer.prompt([
                {
                    type: type,
                    message: message,
                    choices: choices,
                    name : name
                }
            ]).then(answer => {
                resolve(answer)
            }).catch(err => {
                reject(err)
            });
        });
    }
}

module.exports = Question;
