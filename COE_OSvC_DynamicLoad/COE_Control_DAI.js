//------------------------------------
// Oracle COE - Cross CX - Innovations
// jose.antonio.juarez@oracle.com
// louis.albers@oracle.com
// Malaga // Spain // 2021
//------------------------------------

(function() {
    var appName = 'COE Dynamic Load';
    var appVersion = '1.0';
    var mainButton;
    var mainAnimation;
    var loadInterval;
    var loadTimeout;
    var extensionProvider;
    var APIConfig; //sessionToken, restEndPoint, accountId

    //Identify main DOM elements and create handler and OSvC SDK reference
    function init() {
        mainButton = document.getElementById('dynamicLoader');
        mainAnimation = document.getElementById('dynamicWait');
        mainButton.addEventListener('click', startDynamicLoad);
        ORACLE_SERVICE_CLOUD.extension_loader.load(appName, appVersion).then(function(sdk) {
            extensionProvider = sdk;

        });
    }

    //Hide button, save workspace and launch interval (data retrieval) and timeout
    function startDynamicLoad() {
        extensionProvider.registerWorkspaceExtension(function(workspaceRecord) {
            getAPIConfig().then(function(result) {
                APIConfig = result;
                console.log(APIConfig);
                workspaceRecord.executeEditorCommand('Save');
                mainButton.style.display = 'none';
                mainAnimation.style.display = 'block';
                loadInterval = setInterval(CheckNewData, 5000);
                loadTimeout = setTimeout(finishLoad, 30000);

            })
        });
    }

    //Get fields values, request data to API and compare if an integration updated current record
    function CheckNewData() {
        extensionProvider.registerWorkspaceExtension(function(workspaceRecord) {
            workspaceRecord.getFieldValues(['Incident.i_id', 'Incident.C$Actionrequired']).then(function(IFieldDetails) {
                var incidentId = IFieldDetails.getField('Incident.i_id').getLabel();
                var action = IFieldDetails.getField('Incident.C$Actionrequired').getLabel();
                var xhr = new XMLHttpRequest();
                xhr.open("GET", APIConfig.restEndPoint + '/connect/v1.4/incidents/' + incidentId, true);
                xhr.setRequestHeader("Authorization", "Session " + APIConfig.sessionToken);
                xhr.setRequestHeader("OSvC-CREST-Application-Context", appName);
                xhr.onload = function(e) {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            var obj = JSON.parse(xhr.responseText);
                            if (action != obj.customFields.c.actionrequired) {
                                //Update current workspace fields with new data in database (dynamic load)
                                workspaceRecord.updateField('Incident.C$Actionrequired', obj.customFields.c.actionrequired);
                                workspaceRecord.updateField('Incident.C$UpsellOppty', obj.customFields.c.upsell_oppty);
                                workspaceRecord.updateField('Incident.C$Urgent', obj.customFields.c.urgent);
                                workspaceRecord.updateField('Incident.C$Technicianrequired', obj.customFields.c.technicianrequired);
                                finishLoad();
                            }
                        } else {
                            console.log('Error Call API');
                        }
                    }
                }
                xhr.onerror = function(e) {
                    console.error(xhr.statusText);
                };
                xhr.send();
            });
        });
    }
    //Get OSvC Rest API config
    function getAPIConfig() {
        return new Promise(function(resolve, reject) {
            try {
                extensionProvider.getGlobalContext().then(function(globalContext) {
                    _urlrest = globalContext.getInterfaceServiceUrl("REST");
                    _accountId = globalContext.getAccountId();
                    globalContext.getSessionToken().then(function(sessionToken) {
                        resolve({ 'sessionToken': sessionToken, 'restEndPoint': _urlrest, 'accountId': _accountId });
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    //Back to ready state
    function finishLoad() {
        mainButton.style.display = 'block';
        mainAnimation.style.display = 'none';
        clearInterval(loadInterval);
        clearTimeout(loadTimeout);
    }

    dynamicLoaderControl = { init }
})();
dynamicLoaderControl.init();