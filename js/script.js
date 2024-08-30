// app versioning - https://semver.org/
const version = '1.2.1';

// begin yaml generation
let currentYAMLState = {}; // Store the current state of the YAML
//// main function for generating YAML output
async function generateYAML() {
    if (!validateInput()) {
        return;
    }

    // Reset currentYAMLState to start fresh
    currentYAMLState = { version: 3 };

    let apiResources = [];
    let lookupResources = [];
    let extensions = [];
    let hives = {};
    let hasArtifactSelection = false;

    // Capture selected APIs and extensions
    document.querySelectorAll('input[name="api"]:checked').forEach((checkbox) => {
        apiResources.push(checkbox.value);  // This adds each checked API to the apiResources array
    });

    document.querySelectorAll('input[name="lookup"]:checked').forEach((checkbox) => {
        lookupResources.push(checkbox.value);
    });

    document.querySelectorAll('input[name="extensions"]:checked').forEach((checkbox) => {
        extensions.push(checkbox.value);
    });

    // collect artifacts
    const artifactCollection = {};
    const artifactConfigurations = ['linux-logs', 'mac-logs', 'windows-evtx-uploads', 'windows-wel-streaming'];

    artifactConfigurations.forEach(configId => {
        const patterns = getPatterns(configId);
        if (patterns.length > 0) {
            hasArtifactSelection = true;
            artifactCollection[configId] = {
                days_retention: parseInt(document.getElementById('days_retention').value, 10),
                filters: { platforms: [configId.split('-')[0]] },
                is_delete_after: document.getElementById('is_delete_after').value.toLowerCase() === 'true',
                is_ignore_cert: document.getElementById('is_ignore_cert').value.toLowerCase() === 'true',
                patterns: patterns
            };
        }
    });

    // Ensure ext-artifact configuration is consistent
    const extArtifactCheckbox = document.getElementById('ext-artifact');
    if (hasArtifactSelection) {
        if (extArtifactCheckbox && !extArtifactCheckbox.checked) {
            extArtifactCheckbox.checked = true;
            markAutoEnabledCheckbox(extArtifactCheckbox);
        }
        hives['extension_config'] = {
            'ext-artifact': {
                data: {
                    log_rules: artifactCollection
                },
                usr_mtd: {
                    enabled: true,
                    expiry: 0,
                    tags: [],
                    comment: ""
                }
            }
        };
    } else {
        if (extArtifactCheckbox && extArtifactCheckbox.checked && !extensions.includes('ext-artifact')) {
            const index = extensions.indexOf('ext-artifact');
            if (index > -1) {
                extensions.splice(index, 1);
            }
        }
    }

     // Handle user inputs dynamically using user-inputs attribute
     const inputFields = document.querySelectorAll('#user-input-fields input[type="text"]');

     inputFields.forEach(inputField => {
         const inputValue = inputField.value.trim();
         if (inputValue !== '') {
             // Find the corresponding checkbox with the same input ID
             const checkbox = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(chk =>
                 chk.getAttribute('user-inputs') && JSON.parse(chk.getAttribute('user-inputs')).some(cfg => cfg.id === inputField.id)
             );
 
             if (checkbox) {
                 const inputConfig = JSON.parse(checkbox.getAttribute('user-inputs')).find(cfg => cfg.id === inputField.id);
                 const path = inputConfig.path;
 
                 // Use a helper function to set the value at the specified path
                 setYAMLValueByPath(currentYAMLState, path, inputValue);
             }
         }
     });
 
    // Handle values and additional settings in YAML
    document.querySelectorAll('input[type="checkbox"]:checked[user-inputs]').forEach(checkbox => {
        const userInputConfig = checkbox.getAttribute('user-inputs');
        if (userInputConfig) {
            const inputConfigs = JSON.parse(userInputConfig);

            inputConfigs.forEach(config => {
                if (config.value !== undefined) {
                    setYAMLValueByPath(currentYAMLState, config.path, config.value);
                }
            });
        }
    });
    
    // Merge current resources and extensions instead of resetting currentYAMLState
    const yamlObject = { ...currentYAMLState, version: 3 }; // Start with existing state

    if (apiResources.length > 0 || lookupResources.length > 0) {
        yamlObject.resources = yamlObject.resources || {}; // Initialize resources if not present
        if (apiResources.length > 0) {
            yamlObject.resources.api = apiResources;
        }
        if (lookupResources.length > 0) {
            yamlObject.resources.lookup = lookupResources;
        }
    }

    if (extensions.length > 0) {
        yamlObject.extensions = extensions;
    }

    if (Object.keys(hives).length > 0) {
        yamlObject.hives = { ...yamlObject.hives, ...hives }; // Merge hives
    }



    currentYAMLState = { ...yamlObject }; // Update currentYAMLState

    // Apply the selected templates
    const templateCheckboxes = document.querySelectorAll('.template-checkbox');
    for (const checkbox of templateCheckboxes) {
        const templateFilePath = checkbox.getAttribute('data-template-path');
        if (checkbox.checked && templateFilePath) {
            await applyTemplate(templateFilePath);
        }
    }


    removeEmptyKeys(currentYAMLState);
    
    const stateToSerialize = JSON.parse(JSON.stringify(currentYAMLState));
    const yamlOutput = jsyaml.dump(stateToSerialize, { skipInvalid: true });

    const codeElement = document.getElementById('yamlOutput');
    codeElement.textContent = yamlOutput;
    
    Prism.highlightElement(codeElement);
}
//// strip out any keys without values
function removeEmptyKeys(yamlObject) {
    for (const key in yamlObject) {
        if (Array.isArray(yamlObject[key]) && yamlObject[key].length === 0) {
            delete yamlObject[key];
        } else if (typeof yamlObject[key] === 'object' && yamlObject[key] !== null) {
            removeEmptyKeys(yamlObject[key]);
            if (Object.keys(yamlObject[key]).length === 0) {
                delete yamlObject[key];
            }
        }
    }
}
// end yaml generation

// begin template functions
async function applyTemplate(templateFilePath) {    
    if (!templateFilePath) return;

    const loadedYAML = await loadYAMLFromFile(templateFilePath);

    if (loadedYAML) {
        mergeYAMLObjects(currentYAMLState, loadedYAML);

        // Check corresponding checkboxes based on the merged YAML
        if (loadedYAML.resources && loadedYAML.resources.api) {
            loadedYAML.resources.api.forEach(apiResource => {
                const checkbox = document.querySelector(`input[name="api"][value="${apiResource}"]`);
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    markAutoEnabledCheckbox(checkbox);
                }
            });
        }

        if (loadedYAML.resources && loadedYAML.resources.lookup) {
            loadedYAML.resources.lookup.forEach(lookupResource => {
                const checkbox = document.querySelector(`input[name="lookup"][value="${lookupResource}"]`);
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    markAutoEnabledCheckbox(checkbox);
                }
            });
        }

        if (loadedYAML.extensions) {
            loadedYAML.extensions.forEach(extension => {
                const checkbox = document.querySelector(`input[name="extensions"][value="${extension}"]`);
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    markAutoEnabledCheckbox(checkbox);
                }
            });
        }
    }
}
async function removeTemplate(templateFilePath) {
    
    if (!templateFilePath) return;

    const loadedYAML = await loadYAMLFromFile(templateFilePath);

    if (loadedYAML) {
        removeMergedYAML(currentYAMLState, loadedYAML);

        // Uncheck corresponding checkboxes based on the removed YAML
        if (loadedYAML.resources && loadedYAML.resources.api) {
            loadedYAML.resources.api.forEach(apiResource => {
                const checkbox = document.querySelector(`input[name="api"][value="${apiResource}"]`);
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;
                    clearAutoEnabledCheckbox(checkbox);
                }
            });
        }

        if (loadedYAML.resources && loadedYAML.resources.lookup) {
            loadedYAML.resources.lookup.forEach(lookupResource => {
                const checkbox = document.querySelector(`input[name="lookup"][value="${lookupResource}"]`);
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;
                    clearAutoEnabledCheckbox(checkbox);
                }
            });
        }

        if (loadedYAML.extensions) {
            loadedYAML.extensions.forEach(extension => {
                const checkbox = document.querySelector(`input[name="extensions"][value="${extension}"]`);
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;
                    clearAutoEnabledCheckbox(checkbox);
                }
            });
        }
    }
}
async function loadYAMLFromFile(filePath) {
    try {
        const response = await fetch(filePath);
        const yamlText = await response.text();
        return jsyaml.load(yamlText);
    } catch (error) {
        console.error('Error loading YAML file:', error);
        return null;
    }
}
function mergeYAMLObjects(target, source) {
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            if (Array.isArray(source[key])) {
                // Use a Set to avoid duplicates
                target[key] = target[key] || [];
                const sourceArray = source[key];
                const targetArray = new Set(target[key].map(item => JSON.stringify(item)));

                sourceArray.forEach(item => {
                    const itemKey = JSON.stringify(item);
                    if (!targetArray.has(itemKey)) {
                        targetArray.add(itemKey);
                    }
                });

                // Convert back to array and parse JSON for objects, retain primitives as is
                target[key] = Array.from(targetArray).map(item => {
                    try {
                        return JSON.parse(item);
                    } catch (e) {
                        return item; // Return as is if it's not JSON
                    }
                });
            } else if (typeof source[key] === 'object' && source[key] !== null) {
                target[key] = target[key] || {};
                mergeYAMLObjects(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
}
function removeMergedYAML(target, source) {
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            if (Array.isArray(source[key])) {
                if (Array.isArray(target[key])) {
                    // Only remove items that exist in the source, without affecting other items in the target
                    source[key].forEach(item => {
                        const index = target[key].indexOf(item);
                        if (index > -1) {
                            target[key].splice(index, 1);
                        }
                    });
                    if (target[key].length === 0) {
                        delete target[key];
                    }
                }
            } else if (typeof source[key] === 'object' && source[key] !== null) {
                // Recursively remove nested objects
                if (target[key]) {
                    removeMergedYAML(target[key], source[key]);
                    // Check if the object is now empty and remove it if so
                    if (Object.keys(target[key]).length === 0) {
                        delete target[key];
                    }
                }
            } else {
                // Direct value comparison and removal
                if (target[key] === source[key]) {
                    delete target[key];
                }
            }
        }
    }
}
async function loadYAMLAndExtractComments(filePath) {
    try {
        const response = await fetch(filePath);
        const yamlText = await response.text();

        // Extract multi-line comments
        const commentLines = yamlText.split('\n').filter(line => line.trim().startsWith('#'));
        const commentText = commentLines.map(line => line.replace(/^#/, '').trim()).join(' ');

        return commentText;
    } catch (error) {
        console.error('Error loading YAML file:', error);
        return 'No description available.';
    }
}
function populateTemplateDescriptions() {
    const templateCheckboxes = document.querySelectorAll('.template-checkbox');

    templateCheckboxes.forEach(async (checkbox) => {
        const templateFilePath = checkbox.getAttribute('data-template-path');
        if (templateFilePath) {
            const description = await loadYAMLAndExtractComments(templateFilePath);
            const label = checkbox.closest('label');
            if (label) {
                label.setAttribute('data-content', description);
            }
        }
    });
}
// end template functions

// begin user inputs functions
let currentDisplayedInputs = new Set(); // Initialize the set outside the function to maintain state
let userInputValues = {}; // Global object to store user input values
//// Function to render user input fields, considering hidden inputs
function renderUserInputFields() {
    const userInputContainer = document.getElementById('user-input-fields');
    const placeholderText = document.getElementById('user-inputs-placeholder');

    let newInputFieldAdded = false; // Track if a new input field is added
    const newDisplayedInputs = new Set();

    const checkedCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked[user-inputs]');

    checkedCheckboxes.forEach(checkbox => {
        const userInputConfig = checkbox.getAttribute('user-inputs');
        if (userInputConfig) {
            const inputConfigs = JSON.parse(userInputConfig);

            inputConfigs.forEach(config => {
                if (!config.hidden) {
                    const inputId = config.id.trim();
                    const label = config.desc.trim();
                    const placeholder = `Enter ${label}`;

                    newDisplayedInputs.add(inputId); // Track this input as being displayed

                    if (!currentDisplayedInputs.has(inputId) && !document.getElementById(inputId)) {
                        // If this input wasn't previously displayed, add it now
                        addUserInputField(inputId, label, placeholder, config.value);
                        newInputFieldAdded = true; // Mark that a new input field was added
                    }
                } else {
                    if (config.value !== undefined) {
                        setYAMLValueByPath(currentYAMLState, config.path, config.value);
                    }
                }
            });
        }
    });

    // Remove inputs that are no longer needed
    currentDisplayedInputs.forEach(id => {
        if (!newDisplayedInputs.has(id)) {
            const inputField = document.getElementById(id);
            if (inputField) {
                inputField.parentElement.remove(); // Remove input from DOM
                // Do not mark as newInputFieldAdded, since we're removing an input
            }
        }
    });

    // Only show toast if a new input field was added
    if (newInputFieldAdded) {
        showToast(); // Show toast notification only if a new input was added
    }

    currentDisplayedInputs = newDisplayedInputs; // Update the set to match currently displayed inputs

    placeholderText.textContent = newDisplayedInputs.size > 0
        ? 'Please provide the necessary information for the selected options. Note, everything you input stays local to your browser. Nothing is saved or transmitted anywhere.'
        : 'No inputs required. Enabling an option which requires user input (API keys, etc) will populate fields on this tab.';

    updateUserInputsBadge();
}
//// Function to add user input fields with an optional value
function addUserInputField(id, labelText, placeholderText, value = '') {
    const userInputContainer = document.getElementById('user-input-fields');
    const inputDiv = document.createElement('div');
    inputDiv.innerHTML = `
        <label for="${id}">${labelText}</label>
        <input type="text" id="${id}" placeholder="${placeholderText}" value="${userInputValues[id] || value}">
    `;
    userInputContainer.appendChild(inputDiv);

    const inputField = document.getElementById(id);
    applyHighlightIfEmpty(inputField); // Initial check if the input should be highlighted

    // Debounced function to update YAML
    const debouncedGenerateYAML = debounce(() => {
        userInputValues[id] = inputField.value;
        generateYAML();
        updateUserInputsBadge(); // Update badge count on input change
    }, 500); // 500 milliseconds debounce delay

    // Attach the debounced function and highlight check to the input event
    inputField.addEventListener('input', function() {
        applyHighlightIfEmpty(inputField); // Check if the input should be highlighted
        debouncedGenerateYAML(); // Trigger YAML generation with debounce
    });
}
//// Function to apply highlight to empty input fields
function applyHighlightIfEmpty(inputField) {
    if (inputField.value.trim() === '') {
        inputField.classList.add('highlight-empty');
    } else {
        inputField.classList.remove('highlight-empty');
    }
}
//// Debounce function: Limits the rate at which a function can fire
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
//// Set hive values by selection metadata
function setYAMLValueByPath(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    while (keys.length > 1) {
        const key = keys.shift();
        if (!current[key]) {
            current[key] = {}; // Create nested objects as needed
        }
        current = current[key];
    }

    current[keys[0]] = value; // Set the final value
}
//// show badge on User Inputs tab for fields needing attention
function updateUserInputsBadge() {
    const inputs = document.querySelectorAll('#user-input-fields input');
    let emptyCount = 0;

    inputs.forEach(input => {
        if (input.value.trim() === '') {
            emptyCount++;
        }
    });

    const badge = document.getElementById('user-inputs-badge');

    if (emptyCount > 0) {
        badge.textContent = emptyCount;
        badge.style.display = 'inline'; // Show badge
        badge.classList.add('attention-badge'); // Add attention-grabbing styles
    } else {
        badge.style.display = 'none'; // Hide badge
        badge.classList.remove('attention-badge'); // Remove styles when not needed
    }
}
//// Function to show a toast notification
function showToast() {
    const toastContainer = document.getElementById('toast-container');
    toastContainer.style.display = 'block'; // Show the toast container

    setTimeout(() => {
        toastContainer.style.display = 'none';
    }, 6000); // 6000 milliseconds = 6 seconds, matches animation duration
}
// end user inputs functions

// begin artifact functions
function getPatterns(configId) {
    const patterns = [];
    document.querySelectorAll(`#patterns-${configId} input[type="checkbox"]:checked`).forEach((checkbox) => {
        patterns.push(checkbox.value);
    });
    return patterns;
}
function toggleArtifactConfig(configId) {
    const parentCheckbox = document.getElementById(configId);
    const checkboxes = document.querySelectorAll(`#patterns-${configId} input[type="checkbox"]`);

    // Set all child checkboxes to the same state as the parent
    if (parentCheckbox.checked) {
        checkboxes.forEach((checkbox) => {
            checkbox.checked = true;
        });
    } else {
        checkboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });
    }

    // Add an event listener to each child checkbox
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            // If all child checkboxes are unchecked, uncheck the parent checkbox
            const allUnchecked = Array.from(checkboxes).every(cb => !cb.checked);
            if (allUnchecked) {
                parentCheckbox.checked = false;
            } else {
                parentCheckbox.checked = true;
            }
        });
    });
}
function validateInput() {
    let isValid = true;

    const daysRetentionInput = document.getElementById('days_retention');
    const daysRetentionError = document.getElementById('days_retention_error');
    const daysRetentionValue = daysRetentionInput.value;

    if (isNaN(daysRetentionValue) || daysRetentionValue.trim() === '') {
        daysRetentionError.innerText = 'Please enter a valid number.';
        isValid = false;
    } else {
        daysRetentionError.innerText = '';
    }

    const isDeleteAfterInput = document.getElementById('is_delete_after');
    const isDeleteAfterError = document.getElementById('is_delete_after_error');
    const isDeleteAfterValue = isDeleteAfterInput.value.toLowerCase();

    if (isDeleteAfterValue !== 'true' && isDeleteAfterValue !== 'false') {
        isDeleteAfterError.innerText = 'Please enter "true" or "false".';
        isValid = false;
    } else {
        isDeleteAfterError.innerText = '';
    }

    const isIgnoreCertInput = document.getElementById('is_ignore_cert');
    const isIgnoreCertError = document.getElementById('is_ignore_cert_error');
    const isIgnoreCertValue = isIgnoreCertInput.value.toLowerCase();

    if (isIgnoreCertValue !== 'true' && isIgnoreCertValue !== 'false') {
        isIgnoreCertError.innerText = 'Please enter "true" or "false".';
        isValid = false;
    } else {
        isIgnoreCertError.innerText = '';
    }

    return isValid;
}
// end artifact functions

// begin general functions
function initializeListeners() {
    const formInputs = document.querySelectorAll('#yamlForm input');

    formInputs.forEach(input => {
        // Check if the input is not a template checkbox
        if (!input.classList.contains('template-checkbox')) {
            if (input.type === 'text' || input.type === 'textarea') {
                input.addEventListener('input', (event) => {
                    generateYAML();
                });
            } else {
                input.addEventListener('change', (event) => {
                    renderUserInputFields();
                    generateYAML();
                });
            }
        }
    });

    // Template listeners
    const templateCheckboxes = document.querySelectorAll('.template-checkbox');
    templateCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async function (event) {
            const changedCheckbox = event.target;
            const templateFilePath = changedCheckbox.getAttribute('data-template-path');

            if (changedCheckbox.checked && templateFilePath) {
                generateYAML();
            } else if (!changedCheckbox.checked && templateFilePath) {
                await removeTemplate(templateFilePath);
                generateYAML();
            }
        });
    });

    // Artifact listeners
    const artifactConfigurations = ['linux-logs', 'mac-logs', 'windows-evtx-uploads', 'windows-wel-streaming'];

    // Function to check if all Artifact Collections are disabled
    function checkArtifactStatus() {
        const isAnyArtifactEnabled = artifactConfigurations.some(id => document.getElementById(id).checked);
        const extArtifactCheckbox = document.getElementById('ext-artifact');

        if (!isAnyArtifactEnabled) {
            extArtifactCheckbox.checked = false;
            clearAutoEnabledCheckbox(extArtifactCheckbox);
            generateYAML(); // Update YAML to reflect the change
        }
    }

    // Listen for changes on both parent and child checkboxes
    artifactConfigurations.forEach(configId => {
        const artifactCheckbox = document.getElementById(configId);
        const childCheckboxes = document.querySelectorAll(`#patterns-${configId} input[type="checkbox"]`);

        // Listen for changes on the parent checkbox
        artifactCheckbox.addEventListener('change', () => {
            if (artifactCheckbox.checked) {
                const extArtifactCheckbox = document.getElementById('ext-artifact');
                extArtifactCheckbox.checked = true;
                generateYAML(); // Trigger YAML generation to reflect the change
            } else {
                checkArtifactStatus();
            }
        });

        // Listen for changes on each child checkbox
        childCheckboxes.forEach(childCheckbox => {
            childCheckbox.addEventListener('change', () => {
                const allUnchecked = Array.from(childCheckboxes).every(cb => !cb.checked);
                if (allUnchecked) {
                    artifactCheckbox.checked = false;
                    checkArtifactStatus();
                } else if (childCheckbox.checked) {
                    artifactCheckbox.checked = true;
                    const extArtifactCheckbox = document.getElementById('ext-artifact');
                    extArtifactCheckbox.checked = true;
                    generateYAML(); // Trigger YAML generation to reflect the change
                }
            });
        });
    });
}
function resetForm() {
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = false;
        clearAutoEnabledCheckbox(checkbox);
    });
    
    document.getElementById('yamlOutput').innerText = jsyaml.dump(currentYAMLState, { skipInvalid: true });
    document.getElementById('days_retention').value = '30';
    document.getElementById('is_delete_after').value = 'false';
    document.getElementById('is_ignore_cert').value = 'true';

    document.getElementById('days_retention_error').innerText = '';
    document.getElementById('is_delete_after_error').innerText = '';
    document.getElementById('is_ignore_cert_error').innerText = '';

    // Clear stored user inputs
    userInputValues = {}; // This line resets the userInputValues object
    // Re-render the user input fields (to clear them) and regenerate the YAML
    renderUserInputFields();

    generateYAML();
}
function copyToClipboard() {
    const yamlOutput = document.getElementById('yamlOutput');
    const range = document.createRange();
    range.selectNode(yamlOutput);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    try {
        document.execCommand('copy');
        alert('YAML copied to clipboard!');
    } catch (err) {
        alert('Failed to copy YAML.');
    }
    window.getSelection().removeAllRanges();
}
function toggleSelectAll(selectAllCheckbox, tabId) {
    const checkboxes = document.querySelectorAll(`#${tabId} .multi-column input[type="checkbox"]`);
    checkboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    generateYAML();
}
function handleCollapsingSections() {
    const collapsibleLegends = document.querySelectorAll('legend[data-toggle="collapse"]');

    collapsibleLegends.forEach(legend => {
        const icon = legend.querySelector('.toggle-icon i');

        if (legend.getAttribute('aria-expanded') === 'true') {
            icon.classList.replace('fa-plus', 'fa-minus');
        } else {
            icon.classList.replace('fa-minus', 'fa-plus');
        }

        legend.addEventListener('click', function() {
            const isExpanded = legend.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {
                icon.classList.replace('fa-minus', 'fa-plus');
            } else {
                icon.classList.replace('fa-plus', 'fa-minus');
            }
        });
    });
}
function loadReadme() {
    fetch('./readme.md')
        .then(response => response.text())
        .then(markdown => {
            const aboutContent = document.getElementById('about-content');
            aboutContent.innerHTML = marked.parse(markdown);
        })
        .catch(error => {
            console.error('Error loading README.md:', error);
            const aboutContent = document.getElementById('about-content');
            aboutContent.innerHTML = '<p>Error loading content.</p>';
        });
}
function markAutoEnabledCheckbox(checkbox) {
    const label = checkbox.closest('label');
    if (label) {
        // Disable the checkbox and add the auto-enabled class
        checkbox.disabled = true;
        label.setAttribute('disabled', 'true');
        label.insertAdjacentHTML('beforeend', ' <i class="fas fa-info-circle auto-enabled-icon" title="This option has been enabled by another selection and cannot be disabled."></i>');
    }
}
function clearAutoEnabledCheckbox(checkbox) {
    const label = checkbox.closest('label');
    if (label) {
        // Enable the checkbox and remove the auto-enabled class
        checkbox.disabled = false;
        label.removeAttribute('disabled');
        const icon = label.querySelector('.auto-enabled-icon');
        if (icon) {
            icon.remove();
        }
    }
}
// end general functions

// initialize on load
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.app-version').textContent = `Version: ${version}`;
    $('[data-toggle="popover"]').popover();
    populateTemplateDescriptions();
    handleCollapsingSections();
    updateUserInputsBadge();
    initializeListeners();
    Prism.highlightAll();
    generateYAML();

    // Check if the 'About' tab is active and load the content
    const aboutTab = document.querySelector('li.active a[href="#about"]');
    if (aboutTab) {
        loadReadme();
        document.getElementById('yamlOutputSection').style.display = 'none'; // Hide YAML Output Block
    }

    // Add event listener for tab changes to show/hide the YAML Output Block
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        if (e.target.hash === '#about') {
            document.getElementById('yamlOutputSection').style.display = 'none'; // Hide YAML Output Block
        } else {
            document.getElementById('yamlOutputSection').style.display = 'block'; // Show YAML Output Block
        }
    });
});