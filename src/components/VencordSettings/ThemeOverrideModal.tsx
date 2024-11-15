/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Card, Forms, React, Text, TextInput, useEffect, useState } from "@webpack/common";

interface ThemeOverrideModalProps extends ModalProps {
    rawCssText: string;
    rawLink: string;
}

function ThemeOverrideModal({ rawCssText, rawLink, onClose, transitionState }: ThemeOverrideModalProps) {
    const settings = useSettings();
    const [cssRules, setCssRules] = useState<CSSRuleList | null>(null);
    const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});

    useEffect(() => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(rawCssText);
        setCssRules(sheet.cssRules);

        if (settings.onlineThemeOverrides[rawLink]) {
            const tempSheet = new CSSStyleSheet();
            tempSheet.replaceSync(settings.onlineThemeOverrides[rawLink]);

            const newOverrides: Record<string, Record<string, string>> = {};
            Array.from(tempSheet.cssRules).forEach(rule => {
                if (!(rule instanceof CSSStyleRule)) return;
                const selector = rule.selectorText;
                newOverrides[selector] = {};

                for (const prop of rule.style) {
                    const value = rule.style.getPropertyValue(prop);
                    const priority = rule.style.getPropertyPriority(prop);
                    if (value) {
                        newOverrides[selector][prop] = `${value}${priority ? " !" + priority : ""}`;
                    }
                }
            });
            setOverrides(newOverrides);
        }
    }, [rawCssText]);

    const updateOverrides = (selector: string, property: string, value: string) => {
        setOverrides(prev => {
            const newOverrides = { ...prev };

            if (!value.trim()) {
                if (newOverrides[selector]) {
                    delete newOverrides[selector][property];
                    if (Object.keys(newOverrides[selector]).length === 0) {
                        delete newOverrides[selector];
                    }
                }
            } else {
                if (!newOverrides[selector]) {
                    newOverrides[selector] = {};
                }
                newOverrides[selector][property] = value;
            }

            if (Object.keys(newOverrides).length === 0) {
                delete settings.onlineThemeOverrides[rawLink];
                settings.onlineThemeOverrides = { ...settings.onlineThemeOverrides };
            } else {
                const sheet = new CSSStyleSheet();
                Object.entries(newOverrides).forEach(([sel, props]) => {
                    const rule = `${sel} { ${Object.entries(props)
                        .map(([p, v]) => `${p}: ${v}`)
                        .join("; ")} }`;
                    try {
                        sheet.insertRule(rule);
                    } catch (e) {
                        console.error("Failed to insert rule:", rule, e);
                    }
                });
                settings.onlineThemeOverrides[rawLink] = Array.from(sheet.cssRules).map(rule => rule.cssText).join(" ");
                settings.onlineThemeOverrides = { ...settings.onlineThemeOverrides };
            }
            return newOverrides;
        });
    };

    if (!cssRules) return null;

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.LARGE} className="vc-text-selectable">
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Theme CSS Override</Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Card className="vc-settings-card" style={{ marginTop: "1em" }}>
                    <Forms.FormText>{rawLink}</Forms.FormText>
                </Card>
                <Forms.FormSection className={Margins.top8}>
                    {Array.from(cssRules || []).map((rule, index) => {
                        if (!(rule instanceof CSSStyleRule)) return null;

                        const selector = rule.selectorText;
                        const properties: [string, string][] = [];

                        for (const prop of rule.style) {
                            const value = rule.style.getPropertyValue(prop);
                            const priority = rule.style.getPropertyPriority(prop);
                            if (value) {
                                properties.push([prop, `${value}${priority ? " !" + priority : ""}`]);
                            }
                        }

                        return (
                            <Card key={index} style={{ marginBottom: ".5em", paddingTop: ".2em", paddingBottom: ".5em" }}>
                                <Forms.FormText style={{ paddingLeft: ".5em", paddingRight: ".5em" }}>{selector}</Forms.FormText>
                                <div style={{ paddingLeft: "1.5em", paddingRight: "1.5em" }}>
                                    {properties.map(([prop, value], propIndex) => (
                                        <Forms.FormText key={propIndex}>
                                            <strong>{prop}:</strong>
                                            <TextInput
                                                value={overrides[selector]?.[prop] ?? ""}
                                                placeholder={value}
                                                onChange={v => {
                                                    setOverrides(prev => ({
                                                        ...prev,
                                                        [selector]: {
                                                            ...(prev[selector] || {}),
                                                            [prop]: v
                                                        }
                                                    }));
                                                }}
                                                onBlur={e => updateOverrides(
                                                    selector,
                                                    prop,
                                                    e.currentTarget.value
                                                )}
                                                style={{ marginBottom: ".5em" }}
                                            />
                                        </Forms.FormText>
                                    ))}
                                </div>
                            </Card>
                        );
                    })}
                </Forms.FormSection>
            </ModalContent>
            <ModalFooter>
                <Button onClick={onClose} size={Button.Sizes.SMALL} color={Button.Colors.PRIMARY} look={Button.Looks.LINK}>
                    Close
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openThemeOverrideModal(rawCssText: string, rawLink: string) {
    openModal(modalProps => (
        <ThemeOverrideModal
            {...modalProps}
            rawCssText={rawCssText}
            rawLink={rawLink}
        />
    ));
}
