import { useState } from 'react';
import { Pencil, Plus, Trash2, Tags } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { CategoryManager } from './CategoryManager';

export function Organization() {
    const { tags, tagsEnabled, configureTags, saveTag, removeTag, isProcessing } = useFinance();
    const [tab, setTab] = useState<'categories' | 'tags'>('tags');
    const [editing, setEditing] = useState<string>();
    const [name, setName] = useState('');
    const [color, setColor] = useState('#00836b');
    return (
        <div className="page-stack">
            <div className="page-intro">
                <div>
                    <span className="eyebrow">DO SEU JEITO</span>
                    <h2>Organize sem complicar</h2>
                    <p>Categorias agrupam. Tags acrescentam o detalhe que importa para você.</p>
                </div>
            </div>
            <div className="tabs" role="tablist" aria-label="Organização">
                <button role="tab" aria-selected={tab === 'tags'} onClick={() => setTab('tags')}>
                    Tags
                </button>
                <button role="tab" aria-selected={tab === 'categories'} onClick={() => setTab('categories')}>
                    Categorias
                </button>
            </div>
            {tab === 'categories' ? (
                <CategoryManager />
            ) : (
                <>
                    <section className="card preference-row">
                        <span className="icon-tile">
                            <Tags size={23} />
                        </span>
                        <div>
                            <h3>Uma camada extra de clareza</h3>
                            <p>
                                Use tags opcionais nos lançamentos e veja seus gastos por assunto. Comece com
                                algumas sugestões e personalize.
                            </p>
                        </div>
                        <button
                            className={tagsEnabled ? 'btn-secondary' : 'btn-primary'}
                            disabled={isProcessing}
                            onClick={() => void configureTags(!tagsEnabled)}
                        >
                            {tagsEnabled ? 'Desativar tags' : 'Quero usar tags'}
                        </button>
                    </section>
                    {tagsEnabled && (
                        <section className="card">
                            <div className="section-heading">
                                <div>
                                    <h3>Suas tags</h3>
                                    <p className="muted">
                                        Até cinco por lançamento. Excluir uma tag mantém suas contas.
                                    </p>
                                </div>
                                <span className="quiet-badge">{tags.length} / 100</span>
                            </div>
                            <form
                                className="tag-form"
                                onSubmit={async (event) => {
                                    event.preventDefault();
                                    if (await saveTag(name, color, editing)) {
                                        setName('');
                                        setEditing(undefined);
                                    }
                                }}
                            >
                                <label htmlFor="tag-name">
                                    {editing ? 'Editar tag' : 'Nova tag'}
                                    <input
                                        id="tag-name"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        maxLength={40}
                                        required
                                        placeholder="Ex.: férias, academia, mercado"
                                    />
                                </label>
                                <label htmlFor="tag-color">
                                    Cor
                                    <input
                                        id="tag-color"
                                        type="color"
                                        value={color}
                                        onChange={(event) => setColor(event.target.value)}
                                    />
                                </label>
                                <button className="btn-primary" disabled={isProcessing}>
                                    <Plus size={17} />
                                    {editing ? 'Salvar' : 'Adicionar'}
                                </button>
                                {editing && (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => {
                                            setEditing(undefined);
                                            setName('');
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </form>
                            <div className="tag-grid">
                                {tags.map((tag) => (
                                    <article className="tag-card" key={tag.id}>
                                        <span>
                                            <i style={{ background: tag.color }} />#{tag.name}
                                        </span>
                                        <div>
                                            <button
                                                className="icon-btn"
                                                aria-label={`Editar tag ${tag.name}`}
                                                onClick={() => {
                                                    setEditing(tag.id);
                                                    setName(tag.name);
                                                    setColor(tag.color);
                                                }}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                className="icon-btn"
                                                aria-label={`Excluir tag ${tag.name}`}
                                                disabled={isProcessing}
                                                onClick={() => {
                                                    if (
                                                        confirm(
                                                            `Excluir a tag “${tag.name}”? Seus lançamentos serão mantidos.`,
                                                        )
                                                    )
                                                        void removeTag(tag.id);
                                                }}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
