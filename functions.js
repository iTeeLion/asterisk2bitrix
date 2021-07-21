const libRequest = require('request-promise');
const util = require('util');
const libFs = require('fs');

var functions = function (bxConfig, callsConfig) {

    /*
     *  Init
     */
    this.debugAsterisk = true;
    this.debugBitrix = false;
    this.dump2file = false;
    this.bxConfig = bxConfig;
    this.callsConfig = callsConfig;

    this.withZeros = function (val) {
        if (val < 10) {
            return '0' + val;
        } else {
            return val
        }
    }

    this.logIt = function (toLog) {
        console.log(toLog);
        if(this.dump2file){
            this.log2file(toLog);
        }
    }

    this.log2file = function (toLog) {
        if(typeof(toLog) == 'object'){
            toLog = JSON.stringify(toLog);
        }
        libFs.appendFileSync('./server.log', toLog + '\n');
    }

    this.getToday = function () {
        var today = new Date();
        today.setHours(today.getHours() + 3);
        return today;
    }


    //
    //  Queries
    //

    /*
     *  BXQ update lead
     */
    this.updateLead = function (id, fields, params) {
        this.logIt('[BXQ] Update lead');

        var formData = {
            'id': id,
            'fields': fields,
            'params': params
        };

        var query = {
            method: 'POST',
            url: this.bxConfig.inHookUrl + 'crm.lead.update',
            form: formData
        };

        res = libRequest.post(query);
        return res;
    };

    /*
     *  BXQ get user id by extension
     */
    this.getUserByExt = function (ext) {
        this.logIt('[BXQ] Get user id by ext');

        var query = {
            method: 'POST',
            uri: this.bxConfig.inHookUrl + 'user.search.json',
            form: {
                'FILTER': {
                    'UF_PHONE_INNER': ext
                }
            }
        };

        return libRequest(query);
    };

    /*
     *  BXQ show call card
     */
    this.doShowCall = function (callId, userId) {
        this.logIt('[BXQ] Show call card');

        var query = {
            method: 'POST',
            url: this.bxConfig.inHookUrl + 'telephony.externalcall.show',
            form: {
                'CALL_ID': callId,
                'USER_ID': userId
            }
        };

        return libRequest.post(query);
    };

    /*
     *  BXQ hide call card
     */
    this.doHideCall = function (callId, userId) {
        this.logIt('[BXQ] Hide call card');

        var query = {
            method: 'POST',
            url: this.bxConfig.inHookUrl + 'telephony.externalcall.hide',
            form: {
                'CALL_ID': callId,
                'USER_ID': userId
            }
        };

        return libRequest.post(query);
    };

    /*
     *  BXQ attach record
     */
    this.doAttachRecord = function (callId, filename, fileContent, recordUrl) {
        this.logIt('[BXQ] Attach record');

        formData = {
            'CALL_ID': callId,
            'FILENAME': filename
        };
        if (fileContent) {
            formData.FILE_CONTENT = {filename, fileContent};
        }
        if (recordUrl) {
            formData.RECORD_URL = recordUrl;
        }

        var query = {
            method: 'POST',
            url: this.bxConfig.inHookUrl + 'telephony.externalCall.attachRecord',
            form: formData
        };

        res = libRequest.post(query);
        return res;
    };

    /*
     *  BXQ finish call
     */
    this.doFinishCall = function (callId, ext, userId, duration) {
        this.logIt('[BXQ] Finish call');

        var formData = {
            'CALL_ID': callId,
            'DURATION': duration
        };
        if (ext) {
            formData.USER_PHONE_INNER = ext;
        }
        if (userId) {
            formData.USER_ID = userId;
        }

        var query = {
            method: 'POST',
            url: this.bxConfig.inHookUrl + 'telephony.externalcall.finish',
            form: formData
        };

        return libRequest.post(query);
    };

    /*
     *  Query bitrix call in
     */
    this.registerCallIn = function (phone, ext, userId) {
        this.logIt('[BXQ] Register in call');

        var today = this.getToday();
        var nowStr = today.toISOString();
        var formData = {
            'PHONE_NUMBER': phone,
            'CRM_CREATE': 1,
            'TYPE': 2,
            'SHOW': 1,
            'CALL_START_DATE': nowStr
        };
        if (ext) {
            formData.USER_PHONE_INNER = ext;
        }
        if (userId) {
            formData.USER_ID = userId;
        }

        var query = {
            method: 'POST',
            url: this.bxConfig.inHookUrl + 'telephony.externalcall.register.json',
            form: formData
        };

        return libRequest.post(query);
    };

    /*
     *  Query bitrix call out
     */
    this.registerCallOut = function (phone, ext, userId) {
        this.logIt('[BXQ] Register out call');

        var today = this.getToday();
        var nowStr = today.toISOString();
        var formData = {
            'PHONE_NUMBER': phone,
            'CRM_CREATE': 0,
            'TYPE': 1,
            'SHOW': 1,
            'CALL_START_DATE': nowStr
        };
        if (ext) {
            formData.USER_PHONE_INNER = ext;
        }
        if (userId) {
            formData.USER_ID = userId;
        }

        var query = {
            method: 'POST',
            url: this.bxConfig.inHookUrl + 'telephony.externalcall.register.json',
            form: formData
        };

        return libRequest.post(query);
    };

    /*
     *  Save info about call
     */
    this.writeCallData = async function (phone, data) {
        res = libFs.writeFile(this.callsConfig.cacheFolder + phone + '.json', JSON.stringify(data));
        return res;
    };

    /*
     *  Get saved info about call
     */
    this.readCallData = async function (phone) {
        const readFile = util.promisify(libFs.readFile);
        let data = await readFile(this.callsConfig.cacheFolder + phone + '.json', "utf8");
        return JSON.parse(data);
    };

    /*
     *  Delete call data file
     */
    this.deleteCallData = function (phone) {
        libFs.unlinkSync(this.callsConfig.cacheFolder + phone + '.json');
    };

    /*
     *  Ext number from channel name
     */
    this.getExtFromChannel = function (channel) {
        return channel.match('[0-9]+')[0];
    };

    /*
     *  Fin record file and data
     */
    this.getRecordData = function (objEvent, from, to) {
        var recordData = {
            'duration': 1
        };

        var ts = objEvent.Timestamp;
        var date = new Date(parseInt(ts) * 1000);
        var datePath = date.getFullYear() + '-' + this.withZeros(date.getMonth() * 1 + 1) + '-' + this.withZeros(date.getDate()) + '/';
        var fileNameSuffix = from.substring(1) + '--' + to + '.wav';

        var recordsList = libFs.readdirSync(this.callsConfig.recordsFolder + datePath);
        recordsList.forEach(function (record) {
            if(record.indexOf(fileNameSuffix) + 1){
                recordData.name = record;
            }
        });
        recordData.path = this.callsConfig.recordsFolder + datePath + recordData.name;

        if (libFs.existsSync(recordData.path)) {
            var fileStats = libFs.statSync(recordData.path);
            var now = date.getTime();
            callDuration = parseInt((now - parseInt(fileStats.atimeMs)) / 1000) + '';
            if (callDuration > 0) {
                recordData.duration = callDuration
            }
            if (this.debugAsterisk) {
                this.logIt('--Get record data--');
                this.logIt(recordData);
            }
            return recordData;
        }else{
            return false;
        }
    };


    //
    //  Business logic
    //


    /*
     *  AE DialBegin - in
     */
    this.dialBegin_in = async function (objEvent) {
        this.logIt('[EVENT] DialBegin - in');
        if (this.debugAsterisk) {
            this.logIt(objEvent);
        }
        var ext = objEvent.DestCallerIDNum;
        var phone = objEvent.CallerIDNum;
        this.logIt('Extension: ' + ext + '; Phone:' + phone + '.');

        let callResJson = await this.registerCallIn(phone, ext, false);
        callRes = JSON.parse(callResJson);
        if (this.debugBitrix) {
            this.logIt(callRes);
        }

        fileData = {};
        fileData.callId = callRes.result.CALL_ID;
        fileData.leadId = callRes.result.CRM_CREATED_LEAD;
        let res = await this.writeCallData(phone, fileData);
    };

    /*
     *  AE DialBegin - out
     */
    this.dialBegin_out = async function (objEvent) {
        this.logIt('[EVENT] DialBegin - out');
        if (this.debugAsterisk) {
            this.logIt(objEvent);
        }
        var ext = this.getExtFromChannel(objEvent.Channel);
        var phone = objEvent.DestCallerIDNum;
        this.logIt('Extension: ' + ext + '; Phone:' + phone + '.');

        let callResJson = await this.registerCallOut(phone, ext, false);
        callRes = JSON.parse(callResJson);
        if (this.debugBitrix) {
            this.logIt(callRes);
        }

        fileData = {};
        fileData.callId = callRes.result.CALL_ID;
        fileData.leadId = callRes.result.CRM_CREATED_LEAD;
        let res = await this.writeCallData(phone, fileData);
    };

    /*
     *  AE DialBegin
     */
    this.dialBegin = function (objEvent) {
        // Входящие
        if (objEvent.Context == 'macro-in') {
            this.dialBegin_in(objEvent);
        }

        // Исходящие
        if (objEvent.Context == 'macro-mt') {
            this.dialBegin_out(objEvent);
        }
    };

    /*
     *  AE hangup - both
     */
    this.hangup_both = async function (objEvent, ext, phone) {
        this.logIt('[EVENT] Hangup - both');

        var callData = await this.readCallData(phone);

        let res = await this.doFinishCall(callData.callId, ext, false, objEvent.recordData.duration);
        if (this.debugBitrix) {
            this.logIt(res);
        }

        if (objEvent.recordData.path) {
            var recordFileData = libFs.readFileSync(objEvent.recordData.path);
            var recordFileBuffer = new Buffer(recordFileData).toString('base64');
            let res = await this.doAttachRecord(callData.callId, objEvent.recordData.name, recordFileBuffer, false);
            if (this.debugBitrix) {
                this.logIt(res);
            }
        }else{
            this.logIt('Record not found');
        }

        if(parseInt(callData.leadId)){
            let userJson = await this.getUserByExt(ext);
            var user = JSON.parse(userJson);
            if (user.result[0]) {
                var userId = user.result[0].id;
                fields = {
                    'ASSIGNED_BY_ID': userId
                };
                let res = await this.updateLead(callData.leadId, fields, []);
                if (this.debugBitrix) {
                    this.logIt(res);
                }
            }
        }

        await this.deleteCallData(phone);
    };

    /*
     *  AE Hangup - in
     */
    this.hangup_in = async function (objEvent) {
        this.logIt('[EVENT] Hangup - in');
        if (this.debugAsterisk) {
            this.logIt(objEvent);
        }
        var ext = objEvent.ConnectedLineNum;
        var phone = objEvent.CallerIDNum;
        this.logIt('Extension: ' + ext + '; Phone:' + phone + '.');

        var exten = objEvent.Exten;
        objEvent.recordData = this.getRecordData(objEvent, phone, exten);
        console.log(objEvent.recordData);

        this.hangup_both(objEvent, ext, phone);
    };

    /*
     *  AE Hangup - out
     */
    this.hangup_out = async function (objEvent) {
        this.logIt('[EVENT] Hangup - out');
        if (this.debugAsterisk) {
            this.logIt(objEvent);
        }
        var ext = this.getExtFromChannel(objEvent.Channel);
        var phone = objEvent.Exten;
        this.logIt('Extension: ' + ext + '; Phone:' + phone + '.');

        objEvent.recordData = this.getRecordData(objEvent, ext, phone);
        console.log(objEvent.recordData);

        this.hangup_both(objEvent, ext, phone);
    };

    /*
     *  AE Hangup
     */
    this.hangup = async function (objEvent) {
        var ext = this.getExtFromChannel(objEvent.Channel);

        if (objEvent.ChannelState == 6 && objEvent.Exten != '' && !(objEvent.CallerIDNum.length <= 4 && objEvent.ConnectedLineNum.length <= 4)) {

            if(objEvent.ConnectedLineNum != '<unknown>'){
                // In
                this.hangup_in(objEvent);
            }else{
                // Out
                this.hangup_out(objEvent);
            }

        }
    };

    /*
     *  AE Newstate - in
     */
    this.newstate_in = async function (objEvent){
        this.logIt('[EVENT] Newstate - in');
        if (this.debugAsterisk) {
            this.logIt(objEvent);
        }
        var ext = objEvent.ConnectedLineNum;
        var phone = objEvent.CallerIDNum;
        this.logIt('Extension: ' + ext + '; Phone:' + phone + '.');

        var callData = await this.readCallData(phone);
        let userJson = await this.getUserByExt(ext);
        var user = JSON.parse(userJson);
        if (user.result[0]) {
            var userId = user.result[0].id;
            res = await this.doShowCall(callData.callId, userId);
        }
    };

    /*
     *  AE Newstate
     */
    this.newstate = async function (objEvent){
        // Входящий и трубка менеджера поднята
        if(objEvent.Context == 'macro-dial' && objEvent.ChannelState == 6){
            this.newstate_in(objEvent);
        }
    }

};
module.exports = functions;