// CHECKBOX "SELECTED" STATUS CHANGE AND GROUP BEHAVIOR------------------------------------
(function() {
       function domReady(callback) {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                callback();
            } else {
                document.addEventListener('DOMContentLoaded', callback);
            }
        }

        domReady(function() {
            const inputProto = HTMLInputElement.prototype;
            const descriptor = Object.getOwnPropertyDescriptor(inputProto, 'checked');
            Object.defineProperty(inputProto, 'checked', {
                get: function() {
                    return descriptor.get.call(this);
                },
                set: function(value) {
                    const oldValue = this.checked;
                    descriptor.set.call(this, value);
                    if (oldValue !== value) {
                        this.dispatchEvent(new CustomEvent('checkedChange', {
                            bubbles: true,
                            detail: { oldValue, newValue: value }
                        }));
                    }
                }
            });

            function toggleSelectedClass(element, shouldAdd) {
                if (!element.classList.contains('text')) {
                    if (shouldAdd) {
                        element.classList.add('selected');
                    } else {
                        element.classList.remove('selected');
                    }
                }
                Array.from(element.children).forEach(child => {
                    if (child.tagName.toLowerCase() === 'div') {
                        toggleSelectedClass(child, shouldAdd);
                    }
                });
            }

            function updateCheckboxClasses(checkbox) {
                const container = checkbox.closest('.checkbox');
                if (container) {
                    toggleSelectedClass(container, checkbox.checked);
                }
            }

            function updateGroupStyles(groupVal) {
                const groupCheckboxes = Array.from(document.querySelectorAll(`input[type="checkbox"][grouping="${groupVal}"]`));
                if (groupCheckboxes.every(cb => !cb.checked)) {
                    groupCheckboxes.forEach(cb => {
                        const container = cb.closest('.checkbox');
                        if (container) {
                            toggleSelectedClass(container, true);
                        }
                    });
                } else {
                    groupCheckboxes.forEach(cb => updateCheckboxClasses(cb));
                }
            }

            function onCheckboxChange(e) {
                const checkbox = e.target;
                if (checkbox.hasAttribute('grouping')) {
                    const groupVal = checkbox.getAttribute('grouping');
                    updateGroupStyles(groupVal);
                } else {
                    updateCheckboxClasses(checkbox);
                }
            }

            document.addEventListener('change', function(e) {
                if (e.target.matches('input[type="checkbox"]')) {
                    onCheckboxChange(e);
                }
            });
            document.addEventListener('checkedChange', function(e) {
                if (e.target.matches('input[type="checkbox"]')) {
                    onCheckboxChange(e);
                }
            });
        });
    })();
// END OF CHECKBOX "SELECTED" STATUS CHANGE AND GROUP BEHAVIOR------------------------------------------
